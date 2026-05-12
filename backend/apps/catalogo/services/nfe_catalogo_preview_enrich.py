"""Enriquecimento do preview NF-e com dados do catálogo e utilitários de comparação."""

from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any

from django.db.models import Prefetch

from apps.catalogo.models import Produto
from apps.fiscal.models import ItemFiscalProduto
from apps.fiscal.services import p_ipi_referencia_produto
from core.choices.fiscal import OrigemMercadoriaICMSChoices
from core.choices.produtos import UnidadeMedidaChoices


def _dec(s: Any) -> Decimal:
    try:
        return Decimal(str(s or "0"))
    except Exception:
        return Decimal("0")


def _norm_str(v: Any) -> str:
    return ("" if v is None else str(v)).strip().upper()


def _norm_digits(v: Any) -> str:
    return "".join(c for c in str(v or "") if c.isdigit())


def produto_resumo_para_preview(produto: Produto) -> dict[str, Any]:
    """Campos comparáveis com o XML / snapshot de linha."""
    ipi_ref = p_ipi_referencia_produto(produto)
    return {
        "id": str(produto.id),
        "codigo": produto.codigo,
        "descricao": produto.descricao,
        "categoria": produto.categoria,
        "unidade_medida": produto.unidade_medida,
        "unidade_tributavel": (produto.unidade_tributavel or "").strip(),
        "preco_base": str(
            produto.preco_base.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        ),
        "ncm": (produto.ncm or "").strip(),
        "cest": (produto.cest or "").strip(),
        "gtin": (produto.gtin or "").strip(),
        "origem_mercadoria": (produto.origem_mercadoria or "").strip(),
        "fabricante": (produto.fabricante or "").strip(),
        "referencia_fabricante": (produto.referencia_fabricante or "").strip(),
        "aliquota_ipi": (
            str(ipi_ref.quantize(Decimal("0.0001")))
            if ipi_ref is not None
            else ""
        ),
        "fabricante_parceiro_id": (
            str(produto.fabricante_parceiro_id) if produto.fabricante_parceiro_id else ""
        ),
    }


def _origem_xml(snap: dict[str, Any]) -> str:
    imp = snap.get("imposto") or {}
    orig = (imp.get("orig") or "").strip()[:1]
    if orig in {c for c, _ in OrigemMercadoriaICMSChoices.choices}:
        return orig
    return OrigemMercadoriaICMSChoices.NACIONAL


def _preco_xml(snap: dict[str, Any]) -> str:
    return str(_dec(snap.get("v_un_com") or "0").quantize(Decimal("0.01"), rounding=ROUND_HALF_UP))


def _aliquota_ipi_xml(snap: dict[str, Any]) -> str:
    imp = snap.get("imposto") or {}
    raw = imp.get("p_ipi")
    if raw is None or str(raw).strip() == "":
        return ""
    try:
        d = Decimal(str(raw).replace(",", "."))
        return str(d.quantize(Decimal("0.0001")))
    except Exception:
        return ""


def _dec_ipi_bruto(s: Any) -> Decimal | None:
    t = ("" if s is None else str(s)).strip().replace(",", ".")
    if not t:
        return None
    try:
        return Decimal(t)
    except Exception:
        return None


def produto_diverge_do_xml(
    resumo: dict[str, Any],
    snap: dict[str, Any],
    *,
    categoria_escolhida: str,
) -> bool:
    """True se algum campo principal difere do que seria aplicado a partir do XML + categoria escolhida."""
    unidades = {c for c, _ in UnidadeMedidaChoices.choices}
    u_xml = (snap.get("unidade_catalogo") or UnidadeMedidaChoices.UN).strip()
    if u_xml not in unidades:
        u_xml = UnidadeMedidaChoices.UN
    ut_xml = (snap.get("u_trib_catalogo") or "").strip()
    if ut_xml and ut_xml not in unidades:
        ut_xml = ""

    cod_ref = _norm_str(resumo.get("codigo"))
    desc_xml = _norm_str(snap.get("x_prod") or cod_ref)
    if _norm_str(resumo.get("descricao")) != desc_xml:
        return True
    if (resumo.get("categoria") or "").strip() != (categoria_escolhida or "").strip():
        return True
    if (resumo.get("unidade_medida") or "").strip() != u_xml:
        return True
    if (resumo.get("unidade_tributavel") or "").strip() != ut_xml:
        return True
    if (resumo.get("preco_base") or "") != _preco_xml(snap):
        return True
    if _norm_digits(resumo.get("ncm")) != _norm_digits(snap.get("ncm")):
        return True
    if _norm_digits(resumo.get("cest")) != _norm_digits(snap.get("cest")):
        return True
    if _norm_str(resumo.get("gtin")) != _norm_str(snap.get("c_ean")):
        return True
    if (resumo.get("origem_mercadoria") or "").strip() != _origem_xml(snap):
        return True
    a_db = _dec_ipi_bruto(resumo.get("aliquota_ipi"))
    a_xml = _dec_ipi_bruto(_aliquota_ipi_xml(snap))
    if a_db != a_xml:
        return True
    return False


_ITENS_PREFETCH = Prefetch(
    "itens_fiscais",
    queryset=ItemFiscalProduto.objects.order_by("ordem", "criado_em"),
)


def enrich_snapshot_itens_com_produto_existente(snapshot: dict[str, Any]) -> None:
    """Anexa `produto_existente` em cada item do snapshot (mutação in-place)."""
    itens = snapshot.get("itens")
    if not isinstance(itens, list):
        return
    for item in itens:
        if not isinstance(item, dict):
            continue
        cod = (item.get("c_prod") or "").strip()
        if not cod:
            item["produto_existente"] = None
            continue
        produto = (
            Produto.objects.filter(codigo__iexact=cod)
            .select_related("fabricante_parceiro")
            .prefetch_related(_ITENS_PREFETCH)
            .first()
        )
        item["produto_existente"] = (
            produto_resumo_para_preview(produto) if produto else None
        )


def lookup_produto_resumo_por_codigo(codigo: str) -> dict[str, Any] | None:
    cod = (codigo or "").strip()
    if not cod:
        return None
    produto = (
        Produto.objects.filter(codigo__iexact=cod)
        .select_related("fabricante_parceiro")
        .prefetch_related(_ITENS_PREFETCH)
        .first()
    )
    return produto_resumo_para_preview(produto) if produto else None

