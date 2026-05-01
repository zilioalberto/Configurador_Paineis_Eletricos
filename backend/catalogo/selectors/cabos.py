from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_cabos(
    corrente_necessaria_a: Decimal | float | None = None,
    tipo_cabo: str | None = None,
    secao_mm2_min: Decimal | float | None = None,
    material_condutor: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if corrente_necessaria_a is not None:
        kw["corrente_admissivel_a__isnull"] = False
        kw["corrente_admissivel_a__gte"] = corrente_necessaria_a
    if tipo_cabo:
        kw["tipo_cabo"] = tipo_cabo
    if secao_mm2_min is not None:
        kw["secao_mm2__gte"] = secao_mm2_min
    if material_condutor:
        kw["material_condutor"] = material_condutor
    return filtrar_produtos_especificacao(
        Cat.CABO,
        ordenar=(
            "especificacao_cabo__corrente_admissivel_a",
            "especificacao_cabo__secao_mm2",
            "codigo",
            "descricao",
        ),
        **kw,
    )
