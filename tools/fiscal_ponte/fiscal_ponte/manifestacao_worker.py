"""Processa manifestações pendentes no servidor via ACBr (certificado A3)."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field

from .api_client import FiscalApiClient
from .config import PonteConfig
from .sefaz.acbr_manifestacao import AcbrManifestacaoClient

logger = logging.getLogger(__name__)


@dataclass
class ManifestacaoWorkerResult:
    processadas: int = 0
    sucesso: int = 0
    erros: int = 0
    detalhes: list[str] = field(default_factory=list)


def processar_manifestacoes_pendentes(config: PonteConfig) -> ManifestacaoWorkerResult:
    config.validate()
    api = FiscalApiClient(
        config.api_base_url,
        config.agent_token,
        retry_max=config.api_retry_max,
        retry_base_sec=config.api_retry_base_sec,
    )
    pendentes = api.listar_manifestacoes_pendentes()
    resultado = ManifestacaoWorkerResult()

    acbr: AcbrManifestacaoClient | None = None
    if config.sefaz_provider == "acbr":
        acbr = AcbrManifestacaoClient(
            host=config.acbr_host,
            port=config.acbr_port,
            timeout_sec=config.acbr_timeout_sec,
        )

    for item in pendentes:
        resultado.processadas += 1
        doc_id = int(item["id"])
        try:
            if config.sefaz_provider == "stub":
                api.registrar_manifestacao(
                    doc_id,
                    sucesso=True,
                    protocolo="STUB-HOMOLOG",
                    cstat="135",
                    motivo="Manifestação simulada (stub)",
                )
                resultado.sucesso += 1
                continue

            if not acbr:
                raise RuntimeError(
                    f"Provedor {config.sefaz_provider!r} não suporta manifestação na SEFAZ."
                )

            res = acbr.enviar_manifestacao(
                chave_acesso=str(item["chave_acesso"]),
                cnpj=str(item.get("cnpj_destinatario") or config.cnpj),
                tipo=str(item["manifestacao_tipo"]),
                justificativa=str(item.get("manifestacao_justificativa") or ""),
            )
            api.registrar_manifestacao(
                doc_id,
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
                resultado.detalhes.append(f"#{doc_id} cStat={res.cstat} {res.motivo}")
        except Exception as exc:  # noqa: BLE001
            resultado.erros += 1
            msg = str(exc)
            resultado.detalhes.append(f"#{doc_id} {msg}")
            logger.exception("Manifestação falhou documento %s", doc_id)
            try:
                api.registrar_manifestacao(
                    doc_id,
                    sucesso=False,
                    mensagem_erro=msg,
                )
            except Exception:
                logger.exception("Não foi possível registrar erro no servidor doc %s", doc_id)

    return resultado
