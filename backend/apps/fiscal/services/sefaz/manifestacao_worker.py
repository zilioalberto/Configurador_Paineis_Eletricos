"""Processa manifestações pendentes diretamente na SEFAZ."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from apps.fiscal.choices import StatusManifestacaoDestinatarioChoices
from apps.fiscal.models import DocumentoFiscalRecebido
from apps.fiscal.services.manifestacao_destinatario_service import registrar_resultado_manifestacao

from .config import SefazConfig, get_sefaz_config
from .manifestacao import enviar_manifestacao_destinatario

logger = logging.getLogger(__name__)


@dataclass
class ManifestacaoWorkerResult:
    processadas: int = 0
    sucesso: int = 0
    erros: int = 0
    detalhes: list[str] = field(default_factory=list)


def processar_manifestacoes_pendentes(
    *,
    config: SefazConfig | None = None,
    limit: int = 50,
) -> ManifestacaoWorkerResult:
    config = config or get_sefaz_config()
    resultado = ManifestacaoWorkerResult()

    pendentes = (
        DocumentoFiscalRecebido.objects.filter(
            manifestacao_status=StatusManifestacaoDestinatarioChoices.PENDENTE,
        )
        .order_by("manifestacao_solicitada_em", "id")[:limit]
    )

    for documento in pendentes:
        resultado.processadas += 1
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
                resultado.sucesso += 1
            else:
                resultado.erros += 1
                resultado.detalhes.append(f"#{documento.id} cStat={res.cstat} {res.motivo}")
        except Exception as exc:
            resultado.erros += 1
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
