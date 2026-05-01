from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_reles_estado_solido(
    corrente_nominal_min_a: Decimal | float | None = None,
    tensao_carga_v: int | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if corrente_nominal_min_a is not None:
        kw["corrente_nominal_a__gte"] = corrente_nominal_min_a
    if tensao_carga_v is not None:
        kw["tensao_carga_v"] = tensao_carga_v
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.RELE_ESTADO_SOLIDO, **kw)
