from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_barramentos(
    corrente_necessaria_a: Decimal | float | None = None,
    corrente_nominal_min_a: Decimal | float | None = None,
    tipo_barramento: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    corrente_minima = (
        corrente_necessaria_a
        if corrente_necessaria_a is not None
        else corrente_nominal_min_a
    )
    if corrente_minima is not None:
        kw["corrente_nominal_a__isnull"] = False
        kw["corrente_nominal_a__gte"] = corrente_minima
    if tipo_barramento:
        kw["tipo_barramento"] = tipo_barramento
    return filtrar_produtos_especificacao(
        Cat.BARRAMENTO,
        ordenar=(
            "especificacao_barramento__corrente_nominal_a",
            "codigo",
            "descricao",
        ),
        **kw,
    )
