from __future__ import annotations

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_expansoes_plc(
    familia_plc: str | None = None,
    tipo_expansao: str | None = None,
    tensao_alimentacao_v: int | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if familia_plc:
        kw["familia_plc"] = familia_plc
    if tipo_expansao:
        kw["tipo_expansao"] = tipo_expansao
    if tensao_alimentacao_v is not None:
        kw["tensao_alimentacao_v"] = tensao_alimentacao_v
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.EXPANSAO_PLC, **kw)
