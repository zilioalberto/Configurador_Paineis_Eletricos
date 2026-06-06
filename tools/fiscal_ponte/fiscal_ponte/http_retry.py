"""Retry com backoff para erros transitórios da API (5xx / rede)."""
from __future__ import annotations

import logging
import time
from collections.abc import Callable
from typing import TypeVar

import httpx

logger = logging.getLogger(__name__)

T = TypeVar("T")


def chamar_com_retry(
    operacao: Callable[[], T],
    *,
    max_tentativas: int = 3,
    base_delay_sec: float = 2.0,
    operacao_nome: str = "request",
) -> T:
    ultima: Exception | None = None
    tentativas = max(1, max_tentativas)
    for tentativa in range(1, tentativas + 1):
        try:
            return operacao()
        except httpx.HTTPStatusError as exc:
            ultima = exc
            if not _deve_repetir_http(exc):
                raise
            logger.warning(
                "%s HTTP %s — tentativa %s/%s",
                operacao_nome,
                exc.response.status_code,
                tentativa,
                tentativas,
            )
        except (httpx.TransportError, httpx.TimeoutException) as exc:
            ultima = exc
            logger.warning(
                "%s rede/timeout — tentativa %s/%s: %s",
                operacao_nome,
                tentativa,
                tentativas,
                exc,
            )
        if tentativa < tentativas:
            delay = base_delay_sec * (2 ** (tentativa - 1))
            time.sleep(delay)
    assert ultima is not None
    raise ultima


def _deve_repetir_http(exc: httpx.HTTPStatusError) -> bool:
    status = exc.response.status_code
    if status in (408, 429):
        return True
    return status >= 500
