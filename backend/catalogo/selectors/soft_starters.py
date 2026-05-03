from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

_RELATED = "especificacao_soft_starter"
_CAMPO_CORRENTE = f"{_RELATED}__corrente_nominal_a"


def selecionar_soft_starters(
    corrente_nominal_min_a: Decimal | float | None = None,
    tensao_nominal_v: int | None = None,
    tipo_montagem: str | None = None,
    numero_fase_controle: str | None = None,
    niveis: int | None = 1,
) -> QuerySet[Produto]:
    kw: dict = {}
    if corrente_nominal_min_a is not None:
        kw["corrente_nominal_a__gte"] = corrente_nominal_min_a
    if tensao_nominal_v is not None:
        kw["tensao_nominal_v"] = tensao_nominal_v
    if tipo_montagem:
        kw["tipo_montagem"] = tipo_montagem
    if numero_fase_controle:
        kw["numero_fase_controle"] = numero_fase_controle

    qs = filtrar_produtos_especificacao(
        Cat.SOFT_STARTER,
        ordenar=(_CAMPO_CORRENTE, "descricao"),
        **kw,
    )
    qs = qs.order_by(_CAMPO_CORRENTE, "descricao")

    if not niveis or niveis <= 0:
        return qs

    correntes = list(
        qs.order_by(_CAMPO_CORRENTE)
        .values_list(_CAMPO_CORRENTE, flat=True)
        .distinct()[:niveis]
    )
    if not correntes:
        return Produto.objects.none()

    return qs.filter(**{f"{_CAMPO_CORRENTE}__in": correntes}).order_by(
        _CAMPO_CORRENTE,
        "descricao",
    )
