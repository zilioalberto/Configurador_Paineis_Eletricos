"""Sincronização NSU: DistDFe → importação → manifestações pendentes."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import timedelta

import requests
from django.utils import timezone

from apps.fiscal.choices import OrigemImportacaoFiscalChoices
from apps.fiscal.models import ControleNSU
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.utils import normalizar_cnpj, normalizar_nsu

from .cstat_distribuicao import avaliar_resposta_distribuicao
from .config import SefazConfig, get_sefaz_config
from .documentos_distribuidos import (
    salvar_resumo_nfe_distribuido,
    vincular_xml_completo_distribuido,
)
from .distribuicao_dfe import consultar_distribuicao_por_nsu
from .manifestacao_worker import processar_manifestacoes_pendentes, solicitar_ciencia_automatica

logger = logging.getLogger(__name__)

_CSTAT_AGUARDAR_UMA_HORA = {"137", "656"}


@dataclass
class SyncNsuResult:
    sucesso: bool
    mensagem: str
    ciclos_executados: int = 0
    documentos_importados: int = 0
    documentos_novos: int = 0
    documentos_duplicados: int = 0
    resumos_armazenados: int = 0
    resumos_novos: int = 0
    documentos_ignorados: int = 0
    schemas_ignorados: dict[str, int] = field(default_factory=dict)
    erros_importacao: list[str] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)
    ultimo_cstat: str = ""
    ultimo_motivo: str = ""
    ultimo_nsu: str = ""
    max_nsu: str = ""
    manifestacoes_processadas: int = 0
    ciencias_solicitadas: int = 0


def _obter_ou_criar_controle(cnpj: str) -> ControleNSU:
    controle, _ = ControleNSU.objects.get_or_create(
        cnpj=cnpj,
        defaults={"ultimo_nsu": "000000000000000"},
    )
    return controle


def redefinir_nsu_sefaz(cnpj: str, *, novo_nsu: str = "0") -> ControleNSU:
    """Redefine o NSU consumido da SEFAZ (reset/ajuste) e remove o bloqueio temporário.

    Use ``novo_nsu="0"`` para ressincronizar do início (re-baixa os DFe; a importação
    deduplica por chave/NSU). Limpar ``bloqueado_ate`` evita o atraso de 1h após cStat 137/656.
    """
    cnpj_norm = normalizar_cnpj(cnpj)
    if len(cnpj_norm) != 14:
        raise ValueError("CNPJ da empresa inválido.")
    controle = _obter_ou_criar_controle(cnpj_norm)
    nsu = normalizar_nsu(novo_nsu) or "000000000000000"
    controle.ultimo_nsu = nsu
    controle.max_nsu = nsu
    controle.bloqueado_ate = None
    controle.save(
        update_fields=["ultimo_nsu", "max_nsu", "bloqueado_ate", "atualizado_em"]
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
            vincular_xml_completo_distribuido(
                documento_recebido=imp["documento"],
                xml=doc.xml,
                nsu=doc.nsu,
                schema=doc.schema,
            )
        except Exception as exc:
            msg = f"{doc.nsu or 'xml'}: {exc}"
            resultado.erros_importacao.append(msg)
            logger.error("Falha ao importar NF-e: %s", msg)


def _salvar_resumos_distribuicao(dist, config: SefazConfig, resultado: SyncNsuResult) -> None:
    for resumo in getattr(dist, "resumos_nfe", []):
        try:
            salvo = salvar_resumo_nfe_distribuido(
                resumo,
                cnpj_destinatario=config.cnpj,
            )
            resultado.resumos_armazenados += 1
            if salvo.created:
                resultado.resumos_novos += 1
        except Exception as exc:
            msg = f"{resumo.nsu or resumo.chave_acesso}: {exc}"
            resultado.erros_importacao.append(msg)
            logger.error("Falha ao armazenar resumo NF-e: %s", msg)


def _registrar_falha_comunicacao(resultado: SyncNsuResult, exc: Exception) -> None:
    if isinstance(exc, requests.HTTPError):
        status = exc.response.status_code if exc.response is not None else "?"
        alerta = f"SEFAZ retornou HTTP {status}."
    elif isinstance(exc, requests.Timeout):
        alerta = "Tempo esgotado ao consultar a SEFAZ."
    elif isinstance(exc, requests.ConnectionError):
        alerta = "Não foi possível conectar ao webservice da SEFAZ."
    elif isinstance(exc, FileNotFoundError):
        alerta = str(exc)
    else:
        alerta = f"Falha na comunicação com a SEFAZ: {exc}"

    resultado.sucesso = False
    resultado.mensagem = alerta
    resultado.alertas.append(alerta)


def _aplicar_resposta_distribuicao(
    *,
    dist,
    config: SefazConfig,
    resultado: SyncNsuResult,
) -> bool:
    """Processa uma resposta DistDFe. Retorna False para interromper ciclos."""
    resultado.ultimo_cstat = dist.cstat
    resultado.ultimo_motivo = dist.xmotivo
    resultado.ultimo_nsu = dist.ultimo_nsu
    resultado.max_nsu = dist.max_nsu
    resultado.documentos_ignorados += getattr(dist, "documentos_ignorados", 0)
    for schema, quantidade in getattr(dist, "schemas_ignorados", {}).items():
        resultado.schemas_ignorados[schema] = (
            resultado.schemas_ignorados.get(schema, 0) + quantidade
        )

    avaliacao = avaliar_resposta_distribuicao(dist.cstat, dist.xmotivo)
    if avaliacao.alerta:
        resultado.alertas.append(avaliacao.alerta)
    if avaliacao.grave:
        resultado.sucesso = False
        resultado.mensagem = avaliacao.mensagem_resumo
        return False

    _salvar_resumos_distribuicao(dist, config, resultado)
    _importar_documentos_distribuicao(dist, config, resultado)
    return True


def _bloqueio_pos_distribuicao(dist, agora):
    if dist.cstat in _CSTAT_AGUARDAR_UMA_HORA:
        return agora + timedelta(hours=1)
    return None


def _proximo_max_nsu(dist, max_nsu_atual: str, controle: ControleNSU, ultimo_nsu: str) -> str:
    if dist.cstat == "656" and normalizar_nsu(dist.max_nsu) == "000000000000000":
        return max_nsu_atual or controle.max_nsu or ultimo_nsu
    return dist.max_nsu


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

        try:
            dist = consultar_distribuicao_por_nsu(config=config, ultimo_nsu=ultimo_nsu)
        except Exception as exc:
            logger.exception("Falha ao consultar DistDFe")
            _registrar_falha_comunicacao(resultado, exc)
            break

        continuar = _aplicar_resposta_distribuicao(dist=dist, config=config, resultado=resultado)
        ultimo_nsu = dist.ultimo_nsu
        max_nsu = _proximo_max_nsu(dist, max_nsu, controle, ultimo_nsu)
        _atualizar_controle(
            controle,
            ultimo_nsu=ultimo_nsu,
            max_nsu=max_nsu,
            cstat=dist.cstat,
            motivo=dist.xmotivo,
            bloqueado_ate=_bloqueio_pos_distribuicao(dist, agora),
        )

        if not continuar or dist.cstat == "137" or ultimo_nsu >= max_nsu:
            break

    return ultimo_nsu, max_nsu, resultado


def _processar_manifestacoes_pos_sync(config: SefazConfig, resultado: SyncNsuResult) -> None:
    try:
        if config.auto_ciencia:
            resultado.ciencias_solicitadas = solicitar_ciencia_automatica()
        man = processar_manifestacoes_pendentes(config=config)
        resultado.manifestacoes_processadas = man.processadas
        if man.erros:
            logger.warning("Manifestações com erro: %s", man.detalhes)
    except Exception:
        logger.exception("Falha ao processar manifestações pendentes")


def _resultado_bloqueado(controle: ControleNSU, agora) -> SyncNsuResult | None:
    if not (controle.bloqueado_ate and controle.bloqueado_ate > agora):
        return None
    if controle.ultimo_cstat == "137":
        alerta = (
            "A SEFAZ não localizou documentos na última consulta. "
            f"Aguarde até {controle.bloqueado_ate.isoformat()} para consultar novamente."
        )
    else:
        alerta = f"Consulta bloqueada pela SEFAZ até {controle.bloqueado_ate.isoformat()}."
    return SyncNsuResult(
        sucesso=False,
        mensagem=alerta,
        alertas=[alerta],
        ultimo_cstat=controle.ultimo_cstat,
        ultimo_motivo=controle.ultimo_motivo,
        ultimo_nsu=controle.ultimo_nsu,
        max_nsu=controle.max_nsu or controle.ultimo_nsu,
    )


def _aplicar_erros_importacao(resultado: SyncNsuResult) -> None:
    if not resultado.erros_importacao:
        return
    resultado.sucesso = False
    resultado.mensagem = "Sincronização com erros de importação"
    for erro in resultado.erros_importacao[:5]:
        if erro not in resultado.alertas:
            resultado.alertas.append(erro)


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

    bloqueado = _resultado_bloqueado(controle, agora)
    if bloqueado is not None:
        return bloqueado

    ultimo_nsu = normalizar_nsu(controle.ultimo_nsu) or "000000000000000"
    ultimo_nsu, max_nsu, resultado = _executar_ciclos_distribuicao(
        config=config,
        controle=controle,
        ultimo_nsu=ultimo_nsu,
        agora=agora,
    )

    _aplicar_erros_importacao(resultado)

    if processar_manifestacoes:
        _processar_manifestacoes_pos_sync(config, resultado)

    resultado.ultimo_nsu = ultimo_nsu
    resultado.max_nsu = max_nsu
    return resultado
