"""Nome exibível do fabricante vinculado a um produto do catálogo."""
from __future__ import annotations

from apps.catalogo.models import Produto


def nome_fabricante_produto(produto: Produto | None) -> str:
    """Retorna razão social ou nome fantasia do parceiro fabricante, se houver."""
    if produto is None:
        return ""
    parceiro_id = getattr(produto, "fabricante_parceiro_id", None)
    if not parceiro_id:
        return ""
    try:
        parceiro = produto.fabricante_parceiro
    except Exception:
        return ""
    if parceiro is None:
        return ""
    return (parceiro.nome_fantasia or parceiro.razao_social or "").strip()
