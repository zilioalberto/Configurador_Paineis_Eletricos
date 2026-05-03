from __future__ import annotations

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_chaves_seletoras(
    tipo_seletor: str | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_seletor:
        kw["tipo_seletor"] = tipo_seletor
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.CHAVE_SELETORA, **kw)
