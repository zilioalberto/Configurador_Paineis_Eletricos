"""Processa manifestações pendentes diretamente na SEFAZ."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from apps.fiscal.choices import (
    StatusManifestacaoDestinatarioChoices,
    TipoDocumentoSefazDistribuidoChoices,
    TipoManifestacaoDestinatarioChoices,
)
from apps.fiscal.models import DocumentoFiscalRecebido, DocumentoSefazDistribuido
from apps.fiscal.services.manifestacao_destinatario_service import (
    ManifestacaoDestinatarioError,
    registrar_resultado_manifestacao,
    solicitar_manifestacao_destinatario,
)

from .config import SefazConfig, get_sefaz_config
from .manifestacao import enviar_manifestacao_destinatario

logger = logging.getLogger(__name__)


@dataclass
class ManifestacaoWorkerResult:
    processadas: int = 0
    sucesso: int = 0
    erros: int = 0
    detalhes: list[str] = field(default_factory=list)


def solicitar_ciencia_automatica(*, limit: int = 200) -> int:
    """Marca como PENDENTE de Ciência todo resumo NF-e ainda não manifestado.

    A Ciência é o que libera o XML completo (com itens) na DistDFe. Após marcar,
    o processamento de manifestações pendentes (chamado no fim do sync) envia à SEFAZ.
    Retorna a quantidade de documentos marcados.
    """
    pendentes = DocumentoSefazDistribuido.objects.filter(
        tipo_documento=TipoDocumentoSefazDistribuidoChoices.RESUMO_NFE,
        manifestacao_status=StatusManifestacaoDestinatarioChoices.NAO_SOLICITADA,
    ).exclude(chave_acesso="")[:limit]

    marcados = 0
    for documento in pendentes:
        try:
            solicitar_manifestacao_destinatario(
                documento,
                tipo=TipoManifestacaoDestinatarioChoices.CIENCIA,
            )
            marcados += 1
        except ManifestacaoDestinatarioError as exc:
            logger.info("Auto-ciência ignorou doc %s: %s", documento.id, exc)
        except Exception:
            logger.exception("Falha ao solicitar auto-ciência doc %s", documento.id)
    return marcados


def processar_manifestacao_documento(
    documento: DocumentoFiscalRecebido | DocumentoSefazDistribuido,
    *,
    config: SefazConfig | None = None,
) -> ManifestacaoWorkerResult:
    config = config or get_sefaz_config()
    resultado = ManifestacaoWorkerResult()
    resultado.processadas = 1
    try:
        res = enviar_manifestacao_destinatario(
            config=config,
            chave_acesso=documento.chave_acesso,
            tipo=documento.manifestacao_tipo or "",
            justificativa=documento.manifestacao_justificativa or "",
        )
        registrar_resultado_manifestacao(
            documento,
            sucesso=res.sucesso,
            protocolo=res.protocolo,
            cstat=res.cstat,
            motivo=res.motivo,
            mensagem_erro="" if res.sucesso else res.motivo or res.resposta_bruta[:500],
        )
        if res.sucesso:
            resultado.sucesso = 1
        else:
            resultado.erros = 1
            resultado.detalhes.append(f"#{documento.id} cStat={res.cstat} {res.motivo}")
    except Exception as exc:
        resultado.erros = 1
        msg = str(exc)
        resultado.detalhes.append(f"#{documento.id} {msg}")
        logger.exception("Manifestação falhou documento %s", documento.id)
        try:
            registrar_resultado_manifestacao(
                documento,
                sucesso=False,
                mensagem_erro=msg,
            )
        except Exception:
            logger.exception("Não foi possível registrar erro doc %s", documento.id)
    return resultado


def processar_manifestacoes_pendentes(
    *,
    config: SefazConfig | None = None,
    limit: int = 50,
) -> ManifestacaoWorkerResult:
    config = config or get_sefaz_config()
    resultado = ManifestacaoWorkerResult()

    pendentes_recebidos = (
        DocumentoFiscalRecebido.objects.filter(
            manifestacao_status=StatusManifestacaoDestinatarioChoices.PENDENTE,
        )
        .order_by("manifestacao_solicitada_em", "id")[:limit]
    )
    pendentes_distribuidos = (
        DocumentoSefazDistribuido.objects.filter(
            manifestacao_status=StatusManifestacaoDestinatarioChoices.PENDENTE,
        )
        .order_by("manifestacao_solicitada_em", "id")[:limit]
    )

    for documento in list(pendentes_recebidos) + list(pendentes_distribuidos):
        if resultado.processadas >= limit:
            break
        item = processar_manifestacao_documento(documento, config=config)
        resultado.processadas += item.processadas
        resultado.sucesso += item.sucesso
        resultado.erros += item.erros
        resultado.detalhes.extend(item.detalhes)

    return resultado
