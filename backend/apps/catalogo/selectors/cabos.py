"""Seletores de produtos do catálogo: cabos."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from apps.catalogo.models import Produto
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
from apps.catalogo.utils.cor_cabo import valores_cor_cabo_equivalentes
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_cabos(
    corrente_necessaria_a: Decimal | float | None = None,
    tipo_cabo: str | None = None,
    secao_mm2_min: Decimal | float | None = None,
    numero_condutores: int | None = None,
    cor: str | None = None,
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
    if numero_condutores is not None:
        kw["numero_condutores"] = numero_condutores
    if cor:
        equivalentes = valores_cor_cabo_equivalentes(cor)
        if len(equivalentes) == 1:
            kw["cor"] = equivalentes[0]
        elif equivalentes:
            kw["cor__in"] = equivalentes
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
