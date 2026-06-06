"""Utilitários do módulo fiscal (normalização de CNPJ/NSU)."""
from __future__ import annotations

import re


def somente_digitos(valor: str, max_len: int | None = None) -> str:
    d = re.sub(r"\D", "", valor or "")
    if max_len is not None:
        return d[:max_len]
    return d


def normalizar_cnpj(valor: str) -> str:
    return somente_digitos(valor, 14)


def normalizar_nsu(valor: str | None) -> str | None:
    if valor is None:
        return None
    texto = str(valor).strip()
    if not texto:
        return None
    digitos = somente_digitos(texto, 15)
    if not digitos:
        return None
    return digitos.zfill(15) if len(digitos) <= 15 else digitos[:15]
