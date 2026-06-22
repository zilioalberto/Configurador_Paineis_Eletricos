"""Sincronização NSU ADN: DistDFe NFS-e → importação."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import timedelta

import requests
from django.utils import timezone

from apps.fiscal.choices import OrigemImportacaoFiscalChoices
from apps.fiscal.models import ControleNsuNfseAdn
from apps.fiscal.utils import normalizar_cnpj, normalizar_nsu

from .config import NfseAdnConfig, get_nfse_adn_config
from .distribuicao_dfe import consultar_distribuicao_por_nsu
from .importar_nfse_recebida import importar_xml_nfse_recebida

logger = logging.getLogger(__name__)

_STATUS_VAZIO = {"NENHUMDOCUMENTOLOCALIZADO", "NENHUM DOCUMENTO LOCALIZADO"}
_STATUS_ERRO = {"ERRO", "REJEICAO", "REJEIÇÃO"}


@dataclass
class SyncNfseAdnResult:
    sucesso: bool
    mensagem: str
    ciclos_executados: int = 0
    documentos_importados: int = 0
    documentos_novos: int = 0
    documentos_duplicados: int = 0
    erros_importacao: list[str] = field(default_factory=list)
    alertas: list[str] = field(default_factory=list)
    ultimo_status: str = ""
    ultimo_motivo: str = ""
    ultimo_nsu: str = ""
    max_nsu: str = ""


def _obter_ou_criar_controle(cnpj: str) -> ControleNsuNfseAdn:
    controle, _ = ControleNsuNfseAdn.objects.get_or_create(
        cnpj=cnpj,
        defaults={"ultimo_nsu": "000000000000000"},
    )
    return controle


def redefinir_nsu_nfse_adn(cnpj: str, *, novo_nsu: str = "0") -> ControleNsuNfseAdn:
    """Redefine o NSU consumido do ADN (reset/ajuste) e remove o bloqueio temporário.

    Útil para ressincronizar do início (``novo_nsu="0"``) quando se suspeita que o
    controle avançou sem importar documentos (ex.: troca de ambiente ou reset de base).
    """
    cnpj_norm = normalizar_cnpj(cnpj)
    if len(cnpj_norm) != 14:
        raise ValueError("CNPJ da empresa inválido (FISCAL_EMPRESA_CNPJ).")
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
    controle: ControleNsuNfseAdn,
    *,
    ultimo_nsu: str,
    max_nsu: str,
    status: str,
    motivo: str,
    bloqueado_ate=None,
) -> None:
    controle.ultimo_nsu = ultimo_nsu
    controle.max_nsu = max_nsu
    controle.ultimo_status = (status or "")[:80]
    controle.ultimo_motivo = (motivo or "")[:255]
    controle.ultima_consulta = timezone.now()
    controle.bloqueado_ate = bloqueado_ate
    controle.save(
        update_fields=[
            "ultimo_nsu",
            "max_nsu",
            "ultimo_status",
            "ultimo_motivo",
            "ultima_consulta",
            "bloqueado_ate",
            "atualizado_em",
        ]
    )


def _documento_e_nfse(doc) -> bool:
    tipo = (doc.tipo_documento or "").upper().replace("-", "").replace(" ", "")
    if "EVENT" in tipo:
        return False
    if "NFSE" in tipo:
        return True
    xml = (doc.xml or "").lower()
    return "nfse" in xml or "compnfse" in xml


def _importar_documentos(dist, config: NfseAdnConfig, resultado: SyncNfseAdnResult) -> None:
    for doc in dist.documentos:
        if not _documento_e_nfse(doc):
            continue
        resultado.documentos_importados += 1
        try:
            imp = importar_xml_nfse_recebida(
                xml=doc.xml,
                nsu_adn=doc.nsu,
                chave_acesso=doc.chave_acesso or None,
                origem_importacao=OrigemImportacaoFiscalChoices.ADN_SYNC,
            )
            if imp["created"]:
                resultado.documentos_novos += 1
            else:
                resultado.documentos_duplicados += 1
        except Exception as exc:
            msg = f"{doc.nsu or doc.chave_acesso or 'xml'}: {exc}"
            resultado.erros_importacao.append(msg)
            logger.error("Falha ao importar NFS-e ADN: %s", msg)


def _registrar_falha_comunicacao(resultado: SyncNfseAdnResult, exc: Exception) -> None:
    if isinstance(exc, requests.HTTPError):
        status = exc.response.status_code if exc.response is not None else "?"
        alerta = f"ADN retornou HTTP {status}."
    elif isinstance(exc, requests.Timeout):
        alerta = "Tempo esgotado ao consultar o ADN NFS-e."
    elif isinstance(exc, requests.ConnectionError):
        alerta = "Não foi possível conectar ao ADN NFS-e."
    elif isinstance(exc, FileNotFoundError):
        alerta = str(exc)
    else:
        alerta = f"Falha na comunicação com o ADN: {exc}"

    resultado.sucesso = False
    resultado.mensagem = alerta
    resultado.alertas.append(alerta)


def _status_normalizado(status: str) -> str:
    return (status or "").upper().replace(" ", "").replace("_", "")


def _executar_ciclos(
    *,
    config: NfseAdnConfig,
    controle: ControleNsuNfseAdn,
    ultimo_nsu: str,
    agora,
) -> tuple[str, str, SyncNfseAdnResult]:
    max_nsu = normalizar_nsu(controle.max_nsu) or ultimo_nsu
    resultado = SyncNfseAdnResult(
        sucesso=True,
        mensagem="Sincronização ADN concluída",
        ultimo_nsu=ultimo_nsu,
        max_nsu=max_nsu,
    )

    for ciclos in range(1, config.max_ciclos_nsu + 1):
        resultado.ciclos_executados = ciclos
        logger.info("ADN ciclo %s — DFe ultNSU=%s", ciclos, ultimo_nsu)

        try:
            dist = consultar_distribuicao_por_nsu(config=config, ultimo_nsu=ultimo_nsu)
        except Exception as exc:
            logger.exception("Falha ao consultar ADN DFe")
            _registrar_falha_comunicacao(resultado, exc)
            break

        resultado.ultimo_status = dist.status_processamento
        resultado.ultimo_motivo = dist.motivo
        resultado.ultimo_nsu = dist.ultimo_nsu
        resultado.max_nsu = dist.max_nsu

        status_norm = _status_normalizado(dist.status_processamento)
        if status_norm in _STATUS_ERRO or (dist.motivo and status_norm == "ERRO"):
            resultado.sucesso = False
            resultado.mensagem = dist.motivo or dist.status_processamento or "Erro ADN"
            resultado.alertas.append(resultado.mensagem)
            break

        _importar_documentos(dist, config, resultado)

        ultimo_nsu = dist.ultimo_nsu
        max_nsu = dist.max_nsu
        bloqueado_ate = None
        if status_norm in _STATUS_VAZIO and ultimo_nsu >= max_nsu:
            bloqueado_ate = agora + timedelta(hours=1)

        _atualizar_controle(
            controle,
            ultimo_nsu=ultimo_nsu,
            max_nsu=max_nsu,
            status=dist.status_processamento,
            motivo=dist.motivo,
            bloqueado_ate=bloqueado_ate,
        )

        if status_norm in _STATUS_VAZIO or ultimo_nsu >= max_nsu:
            break

    return ultimo_nsu, max_nsu, resultado


def executar_sincronizacao_nfse_adn(
    *,
    config: NfseAdnConfig | None = None,
    dry_run: bool = False,
) -> SyncNfseAdnResult:
    config = config or get_nfse_adn_config()
    config.validate()

    if dry_run:
        return SyncNfseAdnResult(
            sucesso=True,
            mensagem="dry-run (configuração ADN OK, sem consulta)",
        )

    controle = _obter_ou_criar_controle(config.cnpj)
    agora = timezone.now()

    if controle.bloqueado_ate and controle.bloqueado_ate > agora:
        alerta = f"Consulta ADN bloqueada até {controle.bloqueado_ate.isoformat()}."
        return SyncNfseAdnResult(
            sucesso=False,
            mensagem=alerta,
            alertas=[alerta],
            ultimo_status=controle.ultimo_status,
            ultimo_motivo=controle.ultimo_motivo,
            ultimo_nsu=controle.ultimo_nsu,
            max_nsu=controle.max_nsu or controle.ultimo_nsu,
        )

    ultimo_nsu = normalizar_nsu(controle.ultimo_nsu) or "000000000000000"
    ultimo_nsu, max_nsu, resultado = _executar_ciclos(
        config=config,
        controle=controle,
        ultimo_nsu=ultimo_nsu,
        agora=agora,
    )

    if resultado.erros_importacao:
        resultado.sucesso = False
        resultado.mensagem = "Sincronização ADN com erros de importação"
        for erro in resultado.erros_importacao[:5]:
            if erro not in resultado.alertas:
                resultado.alertas.append(erro)

    resultado.ultimo_nsu = ultimo_nsu
    resultado.max_nsu = max_nsu
    return resultado
