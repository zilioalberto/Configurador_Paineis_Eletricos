from __future__ import annotations

from django.db.models import QuerySet

<<<<<<< HEAD:backend/apps/catalogo/selectors/canaletas.py
from apps.catalogo.models import Produto
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
=======
from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
>>>>>>> origin/main:backend/catalogo/selectors/canaletas.py
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_canaletas(
    tipo_canaleta: str | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_canaleta:
        kw["tipo_canaleta"] = tipo_canaleta
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.CANALETA, **kw)
