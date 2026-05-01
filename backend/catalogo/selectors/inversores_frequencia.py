from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_inversores_frequencia(
    potencia_nominal_kw_min: Decimal | float | None = None,
    tensao_entrada_v: int | None = None,
    tensao_saida_v: int | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if potencia_nominal_kw_min is not None:
        kw["potencia_nominal_kw__gte"] = potencia_nominal_kw_min
    if tensao_entrada_v is not None:
        kw["tensao_entrada_v"] = tensao_entrada_v
    if tensao_saida_v is not None:
        kw["tensao_saida_v"] = tensao_saida_v
    return filtrar_produtos_especificacao(Cat.INVERSOR_FREQUENCIA, **kw)
