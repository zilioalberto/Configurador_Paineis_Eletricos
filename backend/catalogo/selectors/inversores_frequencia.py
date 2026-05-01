from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

_RELATED = "especificacao_inversor_frequencia"
_CAMPO_CORRENTE = f"{_RELATED}__corrente_nominal_a"


def selecionar_inversores_frequencia(
    potencia_nominal_kw_min: Decimal | float | None = None,
    tensao_entrada_v: int | None = None,
    tensao_saida_v: int | None = None,
    corrente_nominal_min_a: Decimal | float | None = None,
    numero_fases_entrada: str | None = None,
    niveis: int | None = 1,
) -> QuerySet[Produto]:
    kw: dict[str, object] = {}
    if potencia_nominal_kw_min is not None:
        kw["potencia_nominal_kw__gte"] = potencia_nominal_kw_min
    if tensao_entrada_v is not None:
        kw["tensao_entrada_v"] = tensao_entrada_v
    if tensao_saida_v is not None:
        kw["tensao_saida_v"] = tensao_saida_v
    if corrente_nominal_min_a is not None:
        kw["corrente_nominal_a__gte"] = corrente_nominal_min_a
    if numero_fases_entrada:
        kw["numero_fases_entrada"] = numero_fases_entrada

    qs = filtrar_produtos_especificacao(
        Cat.INVERSOR_FREQUENCIA,
        ordenar=(_CAMPO_CORRENTE, "descricao"),
        **kw,
    )
    qs = qs.filter(**{f"{_RELATED}__corrente_nominal_a__isnull": False})
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
