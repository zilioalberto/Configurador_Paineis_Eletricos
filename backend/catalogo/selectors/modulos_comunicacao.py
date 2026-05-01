from __future__ import annotations

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_modulos_comunicacao(
    familia_plc: str | None = None,
    tipo_modulo: str | None = None,
    protocolo: str | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if familia_plc:
        kw["familia_plc"] = familia_plc
    if tipo_modulo:
        kw["tipo_modulo"] = tipo_modulo
    if protocolo:
        kw["protocolo"] = protocolo
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.MODULO_COMUNICACAO, **kw)
