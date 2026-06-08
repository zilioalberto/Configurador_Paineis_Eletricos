"""Seletores de produtos do catálogo: bornes."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import QuerySet

from apps.catalogo.models import Produto, ProdutoAcessorioCompativel
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_bornes(
    tipo_borne: str | None = None,
    corrente_nominal_min_a: Decimal | float | None = None,
    modo_montagem: str | None = None,
    numero_niveis: int | None = None,
    secao_max_mm2_min: Decimal | float | None = None,
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
    if secao_max_mm2_min is not None:
        kw["secao_max_mm2__gte"] = secao_max_mm2_min
    qs = filtrar_produtos_especificacao(Cat.BORNE, **kw)
    return qs.order_by(
        "especificacao_borne__secao_max_mm2",
        "especificacao_borne__corrente_nominal_a",
        "codigo",
        "descricao",
    )


def selecionar_acessorios_borne_compativeis(
    produto_base: Produto,
    tipo_acessorio: str,
) -> QuerySet[ProdutoAcessorioCompativel]:
    return (
        ProdutoAcessorioCompativel.objects.filter(
            produto_base=produto_base,
            tipo_acessorio=tipo_acessorio,
            acessorio__ativo=True,
            acessorio__categoria=Cat.BORNE,
        )
        .select_related("acessorio", "acessorio__especificacao_borne")
        .order_by("prioridade", "acessorio__codigo", "acessorio__descricao")
    )
