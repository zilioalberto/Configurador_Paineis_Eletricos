"""Modo serviço: executa sync periodicamente (NSSM ou console)."""
from __future__ import annotations

import logging
import signal
import time

from .config import PonteConfig
from .sync_cycle import executar_ciclo_sincronizacao

logger = logging.getLogger(__name__)

_parar = False


def _handler_parar(*_args: object) -> None:
    global _parar
    _parar = True
    logger.info("Sinal de paragem recebido — encerra após o ciclo atual.")


def executar_servico(
    config: PonteConfig,
    *,
    intervalo_min: int,
) -> int:
    global _parar
    _parar = False
    signal.signal(signal.SIGINT, _handler_parar)
    signal.signal(signal.SIGTERM, _handler_parar)

    intervalo = max(1, intervalo_min) * 60
    logger.info(
        "Serviço fiscal-ponte iniciado — intervalo %s min, CNPJ %s, provider %s",
        intervalo_min,
        config.cnpj,
        config.sefaz_provider,
    )

    while not _parar:
        try:
            result = executar_ciclo_sincronizacao(config)
            logger.info(result.resumo_log())
        except Exception:
            logger.exception("Erro no ciclo de sincronização")
        if _parar:
            break
        logger.debug("Aguardando %s s até próximo ciclo", intervalo)
        for _ in range(intervalo):
            if _parar:
                break
            time.sleep(1)

    logger.info("Serviço fiscal-ponte encerrado.")
    return 0
