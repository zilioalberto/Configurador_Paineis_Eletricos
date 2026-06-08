"""Seletores de produtos do catálogo: terminais."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from apps.catalogo.models import Produto
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat


def selecionar_terminais(
    *,
    tipo_terminal: str | None = None,
    secao_cabo_mm2: Decimal | float | None = None,
    furo_olhal: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_terminal:
        kw["tipo_terminal"] = tipo_terminal
    if secao_cabo_mm2 is not None:
        kw["secao_min_mm2__lte"] = secao_cabo_mm2
        kw["secao_max_mm2__gte"] = secao_cabo_mm2
    if furo_olhal:
        kw["furo_olhal"] = furo_olhal

    qs = filtrar_produtos_especificacao(Cat.TERMINAIS, **kw)
    return qs.order_by(
        "especificacao_terminal__secao_max_mm2",
        "especificacao_terminal__secao_min_mm2",
        "codigo",
        "descricao",
    )
