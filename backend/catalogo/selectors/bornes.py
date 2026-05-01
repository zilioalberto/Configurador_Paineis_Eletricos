from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_bornes(
    tipo_borne: str | None = None,
    corrente_nominal_min_a: Decimal | float | None = None,
    modo_montagem: str | None = None,
    numero_niveis: int | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_borne:
        kw["tipo_borne"] = tipo_borne
    if corrente_nominal_min_a is not None:
        kw["corrente_nominal_a__gte"] = corrente_nominal_min_a
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    if numero_niveis is not None:
        kw["numero_niveis"] = numero_niveis
    qs = filtrar_produtos_especificacao(Cat.BORNE, **kw)
    return qs.order_by(
        "especificacao_borne__corrente_nominal_a",
        "codigo",
        "descricao",
    )
