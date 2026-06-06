"""Textos padrão da descrição de investimento (solução completa)."""
from __future__ import annotations

INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO = "Demais itens da proposta"


def descricao_investimento_consolidada_padrao(titulo: str) -> str:
    titulo = (titulo or "").strip()
    if titulo:
        return f"Solução completa conforme escopo técnico - {titulo}"
    return "Solução completa conforme escopo técnico"


def descricao_investimento_exibicao(orcamento, padrao: str) -> str:
    custom = (getattr(orcamento, "investimento_descricao", None) or "").strip()
    return custom or padrao
