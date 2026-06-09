"""Normalização da cor de cabos para o valor canônico de CorCaboChoices."""

from __future__ import annotations

import re
import unicodedata

from core.choices.produtos import CorCaboChoices

_VERDE_AMARELO_VARIANTES = frozenset(
    {
        "VERDE_AMARELO",
        "VERDE/AMARELO",
        "VERDE-AMARELO",
        "VERDE AMARELO",
        "verde/amarelo",
        "verde amarelo",
        "verde_amarelo",
    }
)


def _chave_comparacao_cor(valor: str) -> str:
    texto = unicodedata.normalize("NFKC", valor.strip()).upper()
    return re.sub(r"[\s/\\-]+", "_", texto)


def normalizar_cor_cabo(valor: str | None) -> str | None:
    """Converte texto/variantes legadas para o valor de CorCaboChoices."""
    if valor is None or not str(valor).strip():
        return None
    bruto = str(valor).strip()
    if bruto in CorCaboChoices.values:
        return bruto
    chave = _chave_comparacao_cor(bruto)
    if chave == "VERDE_AMARELO":
        return CorCaboChoices.VERDE_AMARELO
    return bruto


def rotulo_cor_cabo(valor: str | None) -> str:
    """Rótulo legível (ex.: Verde/Amarelo) para memória de cálculo e pendências."""
    canon = normalizar_cor_cabo(valor)
    if not canon:
        return "—"
    try:
        return CorCaboChoices(canon).label
    except ValueError:
        return str(valor)


def valores_cor_cabo_equivalentes(valor: str | None) -> list[str]:
    """Valores aceitos em buscas (canônico + variantes legadas no banco)."""
    canon = normalizar_cor_cabo(valor)
    if not canon:
        return []
    if canon == CorCaboChoices.VERDE_AMARELO:
        return sorted(set(_VERDE_AMARELO_VARIANTES) | {canon})
    return [canon]
