from __future__ import annotations

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_gateways(
    protocolo_entrada: str | None = None,
    interface_entrada: str | None = None,
    tensao_alimentacao_v: int | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if protocolo_entrada:
        kw["protocolo_entrada"] = protocolo_entrada
    if interface_entrada:
        kw["interface_entrada"] = interface_entrada
    if tensao_alimentacao_v is not None:
        kw["tensao_alimentacao_v"] = tensao_alimentacao_v
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.GATEWAY, **kw)
