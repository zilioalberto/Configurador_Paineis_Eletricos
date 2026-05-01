from __future__ import annotations

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_botoes(
    tipo_botao: str | None = None,
    modo_montagem: str | None = None,
    iluminado: bool | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_botao:
        kw["tipo_botao"] = tipo_botao
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    if iluminado is not None:
        kw["iluminado"] = iluminado
    return filtrar_produtos_especificacao(Cat.BOTAO, **kw)
