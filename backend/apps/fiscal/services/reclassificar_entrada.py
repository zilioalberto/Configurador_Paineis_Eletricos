"""Reclassificação manual da destinação (objetivo de entrada) de NF-es recebidas.

Permite ao usuário revisar a classificação automática (CFOP) tanto da nota
quanto de cada item, marcando a origem como MANUAL para não ser sobrescrita.
"""
from __future__ import annotations

from collections import defaultdict
from decimal import Decimal

from django.db import transaction

from apps.fiscal.choices import (
    ClassificacaoFiscalOrigemChoices,
    ObjetivoEntradaFiscalChoices,
)
from apps.fiscal.models import DocumentoFiscalRecebido, ItemDocumentoFiscal

_OBJETIVOS_VALIDOS = {valor for valor, _ in ObjetivoEntradaFiscalChoices.choices}


def _objetivo_predominante_por_valor(itens: list[ItemDocumentoFiscal]) -> str:
    """Objetivo cujo somatório de valor_total entre os itens é o maior."""
    totais: dict[str, Decimal] = defaultdict(lambda: Decimal("0"))
    for item in itens:
        totais[item.objetivo_entrada] += item.valor_total or Decimal("0")
    if not totais:
        return ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS
    return max(totais.items(), key=lambda row: row[1])[0]


@transaction.atomic
def reclassificar_entrada(
    documento: DocumentoFiscalRecebido,
    *,
    objetivo_nota: str | None = None,
    itens_objetivo: dict[int, str] | None = None,
) -> DocumentoFiscalRecebido:
    """Aplica reclassificação manual de objetivo de entrada.

    - ``itens_objetivo``: mapa ``{item_id: objetivo}``; cada item alterado vira MANUAL.
    - ``objetivo_nota``: força o objetivo da nota; quando ausente e itens mudaram,
      o objetivo da nota passa a ser o predominante (por valor) entre os itens.
    """
    itens_objetivo = itens_objetivo or {}
    itens_validos = {
        item_id: objetivo
        for item_id, objetivo in itens_objetivo.items()
        if objetivo in _OBJETIVOS_VALIDOS
    }

    itens = list(documento.itens.all())
    houve_mudanca_item = False
    for item in itens:
        novo = itens_validos.get(item.id)
        if novo and novo != item.objetivo_entrada:
            item.objetivo_entrada = novo
            item.classificacao_origem = ClassificacaoFiscalOrigemChoices.MANUAL
            item.save(update_fields=["objetivo_entrada", "classificacao_origem", "atualizado_em"])
            houve_mudanca_item = True

    if objetivo_nota and objetivo_nota in _OBJETIVOS_VALIDOS:
        documento.objetivo_entrada = objetivo_nota
        documento.classificacao_origem = ClassificacaoFiscalOrigemChoices.MANUAL
        documento.save(update_fields=["objetivo_entrada", "classificacao_origem", "atualizada_em"])
    elif houve_mudanca_item:
        documento.objetivo_entrada = _objetivo_predominante_por_valor(itens)
        documento.classificacao_origem = ClassificacaoFiscalOrigemChoices.MANUAL
        documento.save(update_fields=["objetivo_entrada", "classificacao_origem", "atualizada_em"])

    documento.refresh_from_db()
    return documento
