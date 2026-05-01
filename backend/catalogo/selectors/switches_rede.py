from __future__ import annotations

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_switches_rede(
    tipo_switch: str | None = None,
    tensao_alimentacao_v: int | None = None,
    tipo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_switch:
        kw["tipo_switch"] = tipo_switch
    if tensao_alimentacao_v is not None:
        kw["tensao_alimentacao_v"] = tensao_alimentacao_v
    if tipo_montagem:
        kw["tipo_montagem"] = tipo_montagem
    return filtrar_produtos_especificacao(Cat.SWITCH_REDE, **kw)
