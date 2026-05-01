from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_fusiveis(
    corrente_nominal_min_a: Decimal | float | None = None,
    tipo_fusivel: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if corrente_nominal_min_a is not None:
        kw["corrente_nominal_a__gte"] = corrente_nominal_min_a
    if tipo_fusivel:
        kw["tipo_fusivel"] = tipo_fusivel
    return filtrar_produtos_especificacao(Cat.FUSIVEL, **kw)
