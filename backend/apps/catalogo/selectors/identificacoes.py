"""Seletores de produtos do catálogo: identificação."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from apps.catalogo.models import Produto
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat


def selecionar_identificacoes(
    *,
    tipo_identificacao: str | None = None,
    secao_cabo_mm2: Decimal | float | None = None,
    diametro_cabo_mm: Decimal | float | None = None,
    comprimento_min_mm: Decimal | float | None = None,
    tamanho_plaqueta: str | None = None,
    tensao_v: int | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_identificacao:
        kw["tipo_identificacao"] = tipo_identificacao
    if secao_cabo_mm2 is not None:
        kw["secao_min_mm2__lte"] = secao_cabo_mm2
        kw["secao_max_mm2__gte"] = secao_cabo_mm2
    if diametro_cabo_mm is not None:
        kw["diametro_min_mm__lte"] = diametro_cabo_mm
        kw["diametro_max_mm__gte"] = diametro_cabo_mm
    if comprimento_min_mm is not None:
        kw["comprimento_mm__gte"] = comprimento_min_mm
    if tamanho_plaqueta:
        kw["tamanho_plaqueta"] = tamanho_plaqueta
    if tensao_v is not None:
        kw["tensao_v"] = tensao_v

    qs = filtrar_produtos_especificacao(Cat.IDENTIFICACAO, **kw)
    return qs.order_by(
        "especificacao_identificacao__comprimento_mm",
        "especificacao_identificacao__secao_max_mm2",
        "codigo",
        "descricao",
    )
