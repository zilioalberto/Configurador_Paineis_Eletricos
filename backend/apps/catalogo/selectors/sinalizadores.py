from __future__ import annotations

from django.db.models import QuerySet

<<<<<<< HEAD:backend/apps/catalogo/selectors/sinalizadores.py
from apps.catalogo.models import Produto
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
=======
from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
>>>>>>> origin/main:backend/catalogo/selectors/sinalizadores.py
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_sinalizadores(
    cor: str | None = None,
    tensao_comando_v: int | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if cor:
        kw["cor"] = cor
    if tensao_comando_v is not None:
        kw["tensao_comando_v"] = tensao_comando_v
    return filtrar_produtos_especificacao(Cat.SINALIZADOR, **kw)
