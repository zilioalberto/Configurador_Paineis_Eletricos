"""Cálculo do resumo financeiro da oferta (subtotal, desconto, total)."""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP

from apps.orcamentos.models import OrcamentoItem, TipoItemOrcamentoChoices

_QUANTIZE = Decimal("0.01")


def _d(value) -> Decimal:
    return Decimal(str(value or 0))


def _decimal_str(value: Decimal) -> str:
    normalized = value.quantize(_QUANTIZE, rounding=ROUND_HALF_UP).normalize()
    if normalized == normalized.to_integral():
        return str(normalized.quantize(Decimal("1")))
    return format(normalized, "f")


def _subtotal_item(item: OrcamentoItem) -> Decimal:
    return item.quantidade * item.preco_unitario


def calcular_resumo_financeiro_oferta(
    itens: list[OrcamentoItem],
    *,
    desconto_ativo: bool,
    desconto_percentual,
) -> dict:
    """
    Monta totais para prévia e documento.

    Com desconto comercial ativo e percentual > 0:
    - subtotal = soma das linhas;
    - desconto sobre o subtotal;
    - total = subtotal - desconto (IPI já está embutido no preço das linhas).

    Sem desconto (ou percentual zero): total = subtotal.
    """
    subtotal = sum((_subtotal_item(item) for item in itens), Decimal("0")).quantize(
        _QUANTIZE, rounding=ROUND_HALF_UP
    )
    produtos_total = sum(
        (
            _subtotal_item(item)
            for item in itens
            if item.tipo == TipoItemOrcamentoChoices.PRODUTO
        ),
        Decimal("0"),
    ).quantize(_QUANTIZE, rounding=ROUND_HALF_UP)
    servicos_total = (subtotal - produtos_total).quantize(
        _QUANTIZE, rounding=ROUND_HALF_UP
    )

    desconto_pct = _d(desconto_percentual) if desconto_ativo else Decimal("0")
    aplicar_detalhe = desconto_ativo and desconto_pct > 0 and subtotal > 0

    desconto_valor = Decimal("0")
    total = subtotal

    if aplicar_detalhe:
        desconto_valor = (subtotal * desconto_pct / Decimal("100")).quantize(
            _QUANTIZE, rounding=ROUND_HALF_UP
        )
        total = (subtotal - desconto_valor).quantize(_QUANTIZE, rounding=ROUND_HALF_UP)

    return {
        "produtos": _decimal_str(produtos_total),
        "servicos": _decimal_str(servicos_total),
        "subtotal": _decimal_str(subtotal),
        "desconto_ativo": bool(aplicar_detalhe),
        "desconto_percentual": _decimal_str(desconto_pct),
        "desconto_valor": _decimal_str(desconto_valor),
        "impostos_percentual": "0",
        "impostos_valor": "0",
        "total": _decimal_str(total),
    }


def _subtotal_item_json(item: dict) -> Decimal:
    if item.get("subtotal") is not None:
        return _d(item["subtotal"])
    q = _d(item.get("quantidade"))
    p = _d(item.get("preco_unitario"))
    return (q * p).quantize(_QUANTIZE, rounding=ROUND_HALF_UP)


def calcular_resumo_financeiro_snapshot_itens(
    itens_json: list,
    *,
    desconto_ativo: bool,
    desconto_percentual,
) -> dict:
    """Mesma lógica de `calcular_resumo_financeiro_oferta` para itens do snapshot JSON."""
    subtotal = sum((_subtotal_item_json(item) for item in itens_json), Decimal("0")).quantize(
        _QUANTIZE, rounding=ROUND_HALF_UP
    )
    produtos_total = sum(
        (
            _subtotal_item_json(item)
            for item in itens_json
            if item.get("tipo") == TipoItemOrcamentoChoices.PRODUTO
        ),
        Decimal("0"),
    ).quantize(_QUANTIZE, rounding=ROUND_HALF_UP)
    servicos_total = (subtotal - produtos_total).quantize(
        _QUANTIZE, rounding=ROUND_HALF_UP
    )
    desconto_pct = _d(desconto_percentual) if desconto_ativo else Decimal("0")
    aplicar_detalhe = desconto_ativo and desconto_pct > 0 and subtotal > 0
    desconto_valor = Decimal("0")
    total = subtotal
    if aplicar_detalhe:
        desconto_valor = (subtotal * desconto_pct / Decimal("100")).quantize(
            _QUANTIZE, rounding=ROUND_HALF_UP
        )
        total = (subtotal - desconto_valor).quantize(_QUANTIZE, rounding=ROUND_HALF_UP)
    return {
        "produtos": _decimal_str(produtos_total),
        "servicos": _decimal_str(servicos_total),
        "subtotal": _decimal_str(subtotal),
        "desconto_ativo": bool(aplicar_detalhe),
        "desconto_percentual": _decimal_str(desconto_pct),
        "desconto_valor": _decimal_str(desconto_valor),
        "impostos_percentual": "0",
        "impostos_valor": "0",
        "total": _decimal_str(total),
    }
