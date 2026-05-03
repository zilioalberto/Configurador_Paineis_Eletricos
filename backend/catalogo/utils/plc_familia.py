"""Normalização de texto de família de PLC para comparação (evitar duplicatas similares)."""

from __future__ import annotations

import re
import unicodedata


def normalizar_chave_familia_plc(val: str | None) -> str:
    if not val or not str(val).strip():
        return ""
    s = str(val).casefold().strip()
    s = " ".join(s.split())
    s = s.replace("-", " ").replace("_", " ")
    s = " ".join(s.split())
    s = "".join(
        c for c in unicodedata.normalize("NFKD", s) if not unicodedata.combining(c)
    )
    return re.sub(r"[^a-z0-9]+", "", s)
