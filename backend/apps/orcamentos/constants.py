"""Constantes do módulo de orçamentos."""

from __future__ import annotations

from typing import Any

# NCM padrão — painéis elétricos (solução completa na oferta ao cliente).
NCM_INVESTIMENTO_PAINEL_PADRAO = "85371090"

# Identificadores de namespace Office Open XML (ECMA-376).
# O padrão define URIs com esquema ``http://``; não são endpoints acessíveis na rede.
OOXML_W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"  # NOSONAR
OOXML_W14_NS = "http://schemas.microsoft.com/office/word/2010/wordml"  # NOSONAR
OOXML_MC_NS = "http://schemas.openxmlformats.org/markup-compatibility/2006"  # NOSONAR


def registrar_namespaces_ooxml_elementtree(element_tree: Any) -> None:
    """Registra prefixos OOXML usados ao serializar ``word/document.xml``."""
    element_tree.register_namespace("w", OOXML_W_NS)  # NOSONAR
    element_tree.register_namespace("w14", OOXML_W14_NS)  # NOSONAR
    element_tree.register_namespace("mc", OOXML_MC_NS)  # NOSONAR