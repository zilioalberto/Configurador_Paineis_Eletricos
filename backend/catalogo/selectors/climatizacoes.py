from __future__ import annotations

from django.db.models import QuerySet

from catalogo.models import Produto
from catalogo.selectors._base import filtrar_produtos_especificacao
from core.choices.produtos import CategoriaProdutoNomeChoices as Cat

TENSAO_ALIMENTACAO_PERMITIDA = {24, 110, 220, 380}
MODO_MONTAGEM_PERMITIDO = {"TRILHO_DIN", "PLACA", "PORTA"}

def selecionar_climatizacoes(
    tipo_climatizacao: str | None = None,
    tensao_alimentacao_v: int | None = None,
    modo_montagem: str | None = None,
) -> QuerySet[Produto]:
    if (
        tensao_alimentacao_v is not None
        and tensao_alimentacao_v not in TENSAO_ALIMENTACAO_PERMITIDA
    ):
        return Produto.objects.none()
    if modo_montagem and modo_montagem not in MODO_MONTAGEM_PERMITIDO:
        return Produto.objects.none()

    kw: dict = {}
    if tipo_climatizacao:
        kw["tipo_climatizacao"] = tipo_climatizacao
    if tensao_alimentacao_v is not None:
        kw["tensao_alimentacao_v"] = tensao_alimentacao_v
    if modo_montagem:
        kw["modo_montagem"] = modo_montagem
    return filtrar_produtos_especificacao(Cat.CLIMATIZACAO, **kw)
