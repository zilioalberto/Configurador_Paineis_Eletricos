from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat


def selecionar_reles_interface(
    corrente_contato_min_a: Decimal | float | None = None,
    tipo_rele: str | None = None,
    tensao_bobina_v: int | None = None,
    tipo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if corrente_contato_min_a is not None:
        kw["corrente_contato_a__gte"] = corrente_contato_min_a
    if tipo_rele:
        kw["tipo_rele"] = tipo_rele
    if tensao_bobina_v is not None:
        kw["tensao_bobina_v"] = tensao_bobina_v
    if tipo_montagem:
        kw["tipo_montagem"] = tipo_montagem
    return filtrar_produtos_especificacao(Cat.RELE_INTERFACE, **kw)
