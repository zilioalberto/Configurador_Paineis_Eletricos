"""Savepoint por carga em gerações em lote (evita TransactionManagementError)."""

from __future__ import annotations

from collections.abc import Callable, Iterable
from typing import Any, TypeVar

from django.db import transaction

T = TypeVar("T")


def executar_com_savepoint_por_carga(
    projeto: Any,
    cargas: Iterable,
    log_prefix: str,
    processar_fn: Callable[..., T | None],
) -> list[T]:
    """
    Cada carga corre dentro de um ``atomic`` aninhado (savepoint).
    Erro de BD numa carga não impede o processamento das restantes.
    """
    resultados: list[T] = []
    for carga in cargas:
        try:
            with transaction.atomic():
                item = processar_fn(projeto, carga)
                if item is not None:
                    resultados.append(item)
        except Exception as exc:
            print(
                f"{log_prefix} Erro ao processar carga id={carga.pk} "
                f"tag={getattr(carga, 'tag', '')!r}: {exc}"
            )
    return resultados


def executar_com_savepoint_por_carga_lista(
    projeto: Any,
    cargas: Iterable,
    log_prefix: str,
    processar_fn: Callable[..., list],
) -> list:
    """Como ``executar_com_savepoint_por_carga``, mas agrega listas (ex.: contatoras)."""
    resultados: list = []
    for carga in cargas:
        try:
            with transaction.atomic():
                items = processar_fn(projeto, carga)
                if items:
                    resultados.extend(items)
        except Exception as exc:
            print(
                f"{log_prefix} Erro ao processar carga id={carga.pk} "
                f"tag={getattr(carga, 'tag', '')!r}: {exc}"
            )
    return resultados
