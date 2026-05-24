"""
Serviços fiscais: referência de IPI por produto e criação de itens a partir de NF-e.
"""
from __future__ import annotations

from decimal import Decimal, InvalidOperation
from typing import Any

from apps.catalogo.models import Produto
from apps.fiscal.models import ItemFiscalProduto
from core.choices.fiscal import OrigemMercadoriaICMSChoices


def primeiro_item_fiscal_ordenado(produto: Produto) -> ItemFiscalProduto | None:
    """Primeiro item fiscal do produto (ordem, depois data de criação)."""
    return (
        ItemFiscalProduto.objects.filter(produto=produto)
        .order_by("ordem", "criado_em")
        .first()
    )


def p_ipi_referencia_produto(produto: Produto) -> Decimal | None:
    """Alíquota IPI de referência: ``p_ipi`` do primeiro item fiscal (ordem, data)."""
    item = primeiro_item_fiscal_ordenado(produto)
    return item.p_ipi if item else None


def aplicar_aliquota_ipi_referencia_produto(produto: Produto, value: Decimal | None) -> None:
    """Grava IPI de referência no primeiro item fiscal; cria linha mínima se não existir."""
    item = primeiro_item_fiscal_ordenado(produto)
    if item is None:
        if value is None:
            return
        novo = ItemFiscalProduto(produto=produto, ordem=0, rotulo="", p_ipi=value)
        novo.full_clean()
        novo.save()
        return
    item.p_ipi = value
    item.save(update_fields=["p_ipi"])


def _decimal_opt(raw: Any) -> Decimal | None:
    if raw is None or raw == "":
        return None
    try:
        return Decimal(str(raw))
    except (InvalidOperation, ValueError, TypeError):
        return None


def criar_item_fiscal_importacao_nfe(
    produto: Produto,
    item_snap: dict[str, Any],
) -> ItemFiscalProduto | None:
    """
    Persiste um item fiscal a partir do snapshot de linha da NF-e (parser do catálogo).
    Não altera o produto; use antes de ``save()`` se precisar alinhar origem/uTrib no próprio ``Produto``.
    """
    imp = item_snap.get("imposto") or {}
    cfop = (item_snap.get("cfop") or "").strip()[:4]
    if not imp and not cfop:
        return None

    orig = (imp.get("orig") or "").strip()[:1]
    origem = (
        orig
        if orig in {c for c, _ in OrigemMercadoriaICMSChoices.choices}
        else None
    )

    item = ItemFiscalProduto(
        produto=produto,
        ordem=0,
        rotulo="",
        cfop=cfop,
        origem_mercadoria=origem,
        cst_icms=(imp.get("cst_icms") or "")[:3],
        csosn=(imp.get("csosn") or "")[:4],
        icms_grupo_xml=(imp.get("icms_grupo_xml") or "")[:24],
        mod_bc_icms=(imp.get("mod_bc_icms") or "")[:2],
        v_bc_icms=_decimal_opt(imp.get("v_bc_icms")),
        p_icms=_decimal_opt(imp.get("p_icms")),
        v_icms=_decimal_opt(imp.get("v_icms")),
        cst_ipi=(imp.get("cst_ipi") or "")[:2],
        v_bc_ipi=_decimal_opt(imp.get("v_bc_ipi")),
        p_ipi=_decimal_opt(imp.get("p_ipi")),
        v_ipi=_decimal_opt(imp.get("v_ipi")),
        cst_pis=(imp.get("cst_pis") or "")[:2],
        v_bc_pis=_decimal_opt(imp.get("v_bc_pis")),
        p_pis=_decimal_opt(imp.get("p_pis")),
        v_pis=_decimal_opt(imp.get("v_pis")),
        cst_cofins=(imp.get("cst_cofins") or "")[:2],
        v_bc_cofins=_decimal_opt(imp.get("v_bc_cofins")),
        p_cofins=_decimal_opt(imp.get("p_cofins")),
        v_cofins=_decimal_opt(imp.get("v_cofins")),
        n_item_nfe=int(item_snap["n_item"]) if item_snap.get("n_item") is not None else None,
    )
    item.full_clean()
    item.save()
    return item
