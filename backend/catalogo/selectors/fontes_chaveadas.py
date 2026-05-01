from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_fontes_chaveadas(
    tensao_saida_v: int | None = None,
    corrente_saida_min_a: Decimal | float | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tensao_saida_v is not None:
        kw["tensao_saida_v"] = tensao_saida_v
    if corrente_saida_min_a is not None:
        kw["corrente_saida_a__gte"] = corrente_saida_min_a
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.FONTE_CHAVEADA, **kw)
