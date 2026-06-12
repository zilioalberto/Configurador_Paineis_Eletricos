"""Sincronização NSU: DistDFe → importação → manifestações pendentes."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import timedelta

from django.utils import timezone

from apps.fiscal.choices import OrigemImportacaoFiscalChoices
from apps.fiscal.models import ControleNSU
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.utils import normalizar_nsu

from .config import SefazConfig, get_sefaz_config
from .distribuicao_dfe import consultar_distribuicao_por_nsu
from .manifestacao_worker import processar_manifestacoes_pendentes

logger = logging.getLogger(__name__)

_CSTAT_BLOQUEIO = {"656"}


@dataclass
class SyncNsuResult:
    sucesso: bool
    mensagem: str
    ciclos_executados: int = 0
    documentos_importados: int = 0
    documentos_novos: int = 0
    documentos_duplicados: int = 0
    erros_importacao: list[str] = field(default_factory=list)
    ultimo_cstat: str = ""
    ultimo_nsu: str = ""
    max_nsu: str = ""
    manifestacoes_processadas: int = 0


def _obter_ou_criar_controle(cnpj: str) -> ControleNSU:
    controle, _ = ControleNSU.objects.get_or_create(
        cnpj=cnpj,
        defaults={"ultimo_nsu": "000000000000000"},
    )
    return controle


def _atualizar_controle(
    controle: ControleNSU,
    *,
    ultimo_nsu: str,
    max_nsu: str,
    cstat: str,
    motivo: str,
    bloqueado_ate=None,
) -> None:
    controle.ultimo_nsu = ultimo_nsu
    controle.max_nsu = max_nsu
    controle.ultimo_cstat = (cstat or "")[:10]
    controle.ultimo_motivo = (motivo or "")[:255]
    controle.ultima_consulta = timezone.now()
    controle.bloqueado_ate = bloqueado_ate
    controle.save(
        update_fields=[
            "ultimo_nsu",
            "max_nsu",
            "ultimo_cstat",
            "ultimo_motivo",
            "ultima_consulta",
            "bloqueado_ate",
            "atualizado_em",
        ]
    )


def _importar_documentos_distribuicao(dist, config: SefazConfig, resultado: SyncNsuResult) -> None:
    for doc in dist.documentos:
        resultado.documentos_importados += 1
        try:
            imp = importar_xml_nfe(
                xml=doc.xml,
                nsu=doc.nsu,
                cnpj_destinatario=config.cnpj,
                origem_importacao=OrigemImportacaoFiscalChoices.SEFAZ_SYNC,
            )
            if imp["created"]:
                resultado.documentos_novos += 1
            else:
                resultado.documentos_duplicados += 1
        except Exception as exc:
            msg = f"{doc.nsu or 'xml'}: {exc}"
            resultado.erros_importacao.append(msg)
            logger.error("Falha ao importar NF-e: %s", msg)


def _executar_ciclos_distribuicao(
    *,
    config: SefazConfig,
    controle: ControleNSU,
    ultimo_nsu: str,
    agora,
) -> tuple[str, str, SyncNsuResult]:
    max_nsu = normalizar_nsu(controle.max_nsu) or ultimo_nsu
    resultado = SyncNsuResult(
        sucesso=True,
        mensagem="Sincronização concluída",
        ultimo_nsu=ultimo_nsu,
        max_nsu=max_nsu,
    )

    for ciclos in range(1, config.max_ciclos_nsu + 1):
        resultado.ciclos_executados = ciclos
        logger.info("Ciclo %s — DistDFe ultNSU=%s", ciclos, ultimo_nsu)

        dist = consultar_distribuicao_por_nsu(config=config, ultimo_nsu=ultimo_nsu)
        resultado.ultimo_cstat = dist.cstat
        resultado.ultimo_nsu = dist.ultimo_nsu
        resultado.max_nsu = dist.max_nsu

        bloqueado_ate = agora + timedelta(hours=1) if dist.cstat in _CSTAT_BLOQUEIO else None
        _importar_documentos_distribuicao(dist, config, resultado)

        ultimo_nsu = dist.ultimo_nsu
        max_nsu = dist.max_nsu
        _atualizar_controle(
            controle,
            ultimo_nsu=ultimo_nsu,
            max_nsu=max_nsu,
            cstat=dist.cstat,
            motivo=dist.xmotivo,
            bloqueado_ate=bloqueado_ate,
        )

        if dist.cstat == "137" or ultimo_nsu >= max_nsu:
            break

    return ultimo_nsu, max_nsu, resultado


def _processar_manifestacoes_pos_sync(config: SefazConfig, resultado: SyncNsuResult) -> None:
    try:
        man = processar_manifestacoes_pendentes(config=config)
        resultado.manifestacoes_processadas = man.processadas
        if man.erros:
            logger.warning("Manifestações com erro: %s", man.detalhes)
    except Exception:
        logger.exception("Falha ao processar manifestações pendentes")


def executar_sincronizacao_nsu(
    *,
    config: SefazConfig | None = None,
    dry_run: bool = False,
    processar_manifestacoes: bool = True,
) -> SyncNsuResult:
    config = config or get_sefaz_config()
    config.validate()

    if dry_run:
        return SyncNsuResult(
            sucesso=True,
            mensagem="dry-run (configuração OK, sem consulta SEFAZ)",
        )

    controle = _obter_ou_criar_controle(config.cnpj)
    agora = timezone.now()

    if controle.bloqueado_ate and controle.bloqueado_ate > agora:
        return SyncNsuResult(
            sucesso=False,
            mensagem=f"Consulta bloqueada até {controle.bloqueado_ate.isoformat()}",
            ultimo_nsu=controle.ultimo_nsu,
            max_nsu=controle.max_nsu or controle.ultimo_nsu,
        )

    ultimo_nsu = normalizar_nsu(controle.ultimo_nsu) or "000000000000000"
    ultimo_nsu, max_nsu, resultado = _executar_ciclos_distribuicao(
        config=config,
        controle=controle,
        ultimo_nsu=ultimo_nsu,
        agora=agora,
    )

    if resultado.erros_importacao:
        resultado.sucesso = False
        resultado.mensagem = "Sincronização com erros de importação"

    if processar_manifestacoes:
        _processar_manifestacoes_pos_sync(config, resultado)

    resultado.ultimo_nsu = ultimo_nsu
    resultado.max_nsu = max_nsu
    return resultado
