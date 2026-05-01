from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_soft_starters(
    corrente_nominal_min_a: Decimal | float | None = None,
    tensao_nominal_v: int | None = None,
    tipo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if corrente_nominal_min_a is not None:
        kw["corrente_nominal_a__gte"] = corrente_nominal_min_a
    if tensao_nominal_v is not None:
        kw["tensao_nominal_v"] = tensao_nominal_v
    if tipo_montagem:
        kw["tipo_montagem"] = tipo_montagem
    return filtrar_produtos_especificacao(Cat.SOFT_STARTER, **kw)
