"""Seletores de produtos do catálogo: controladores de temperatura."""

from __future__ import annotations

from django.db.models import QuerySet

from apps.catalogo.models import Produto
from apps.catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

def selecionar_controladores_temperatura(
    tipo_sensor: str | None = None,
    tensao_alimentacao_v: int | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    kw: dict = {}
    if tipo_sensor:
        kw["tipo_sensor"] = tipo_sensor
    if tensao_alimentacao_v is not None:
        kw["tensao_alimentacao_v"] = tensao_alimentacao_v
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.CONTROLADOR_TEMPERATURA, **kw)
