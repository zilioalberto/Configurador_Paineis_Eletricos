from __future__ import annotations

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat
from core.choices.paineis import MaterialPainelChoices

def selecionar_paineis(
    tipo_painel: str | None = None,
    material: str | None = None,
    tipo_instalacao: str | None = None,
    cor: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_painel:
        kw["tipo_painel"] = tipo_painel
    if material:
        kw["material"] = material
        if material == MaterialPainelChoices.ACO_INOX:
            kw["cor__isnull"] = True
    if tipo_instalacao:
        kw["tipo_instalacao"] = tipo_instalacao
    if cor and material != MaterialPainelChoices.ACO_INOX:
        kw["cor"] = cor
    return filtrar_produtos_especificacao(Cat.PAINEL, **kw)
