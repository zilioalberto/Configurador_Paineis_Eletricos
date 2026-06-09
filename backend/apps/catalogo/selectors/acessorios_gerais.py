"""Seletores de produtos do catálogo: acessórios gerais por porte/faixa do painel."""

from __future__ import annotations

from decimal import Decimal

from django.db.models import Q, QuerySet

from apps.catalogo.models import Produto
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat


def _faixa_compativel(campo_min: str, campo_max: str, valor: Decimal | int | None) -> Q:
    if valor is None:
        return Q()
    return (Q(**{f"{campo_min}__isnull": True}) | Q(**{f"{campo_min}__lte": valor})) & (
        Q(**{f"{campo_max}__isnull": True}) | Q(**{f"{campo_max}__gte": valor})
    )


def selecionar_acessorios_gerais(
    *,
    tipo_acessorio: str | None = None,
    porte_painel: str | None = None,
    largura_mm: Decimal | int | None = None,
    altura_mm: Decimal | int | None = None,
    profundidade_mm: Decimal | int | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_acessorio:
        kw["tipo_acessorio"] = tipo_acessorio
    if porte_painel:
        kw["porte_painel"] = porte_painel

    qs = filtrar_produtos_especificacao(Cat.ACESSORIOS_GERAIS, **kw)
    qs = qs.filter(
        _faixa_compativel(
            "especificacao_acessorio_geral__largura_min_mm",
            "especificacao_acessorio_geral__largura_max_mm",
            largura_mm,
        ),
        _faixa_compativel(
            "especificacao_acessorio_geral__altura_min_mm",
            "especificacao_acessorio_geral__altura_max_mm",
            altura_mm,
        ),
        _faixa_compativel(
            "especificacao_acessorio_geral__profundidade_min_mm",
            "especificacao_acessorio_geral__profundidade_max_mm",
            profundidade_mm,
        ),
    )
    return qs.order_by(
        "especificacao_acessorio_geral__largura_max_mm",
        "especificacao_acessorio_geral__altura_max_mm",
        "especificacao_acessorio_geral__profundidade_max_mm",
        "codigo",
        "descricao",
    )
