from __future__ import annotations

from django.db.models import QuerySet

<<<<<<< HEAD:backend/apps/catalogo/selectors/trilhos_din.py
from apps.catalogo.models import Produto
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
=======
from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
>>>>>>> origin/main:backend/catalogo/selectors/trilhos_din.py
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_trilhos_din(
    tipo_trilho: str | None = None,
    material: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_trilho:
        kw["tipo_trilho"] = tipo_trilho
    if material:
        kw["material"] = material
    return filtrar_produtos_especificacao(Cat.TRILHO_DIN, **kw)
