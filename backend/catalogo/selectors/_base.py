"""
Infraestrutura comum para seleção de produtos por especificação técnica.

`CATEGORIA_ESPEC_RELATED` reutiliza `CATEGORIA_PARA_CAMPO` dos serializers
(related_name no modelo `Produto`).
"""

from __future__ import annotations

from typing import Any

from django.db.models import QuerySet

from catalogo.api.serializers import CATEGORIA_PARA_CAMPO
from catalogo.models import Produto

CATEGORIA_ESPEC_RELATED: dict[str, str] = dict(CATEGORIA_PARA_CAMPO)


def related_name_para_categoria(categoria: str) -> str | None:
    return CATEGORIA_ESPEC_RELATED.get(categoria)


def filtrar_produtos_especificacao(
    categoria: str,
    *,
    ordenar: tuple[str, ...] = ("codigo", "descricao"),
    **espec_lookups: Any,
) -> QuerySet[Produto]:
    """
    Filtra produtos ativos por categoria e campos da especificação.

    As chaves em `espec_lookups` são aplicadas no modelo de especificação
    (ex.: ``vazao_m3_h__gte``, ``tensao_alimentacao_v``, ``modo_montagem``).
    Valores ``None`` são ignorados.
    """
    related = CATEGORIA_ESPEC_RELATED.get(categoria)
    if related is None:
        return Produto.objects.none()

    qs = Produto.objects.filter(ativo=True, categoria=categoria)
    for key, value in espec_lookups.items():
        if value is None:
            continue
        qs = qs.filter(**{f"{related}__{key}": value})

    return qs.select_related(related).order_by(*ordenar)
