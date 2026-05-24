"""
Sanitizacao de texto para persistencia segura (dados externos / API).
"""
from __future__ import annotations

import re
import unicodedata

from django.core.exceptions import ValidationError
from django.core.validators import validate_email

# Tags e URIs perigosas comuns em injecao armazenada (XSS / HTML).
_UNSAFE_PATTERNS = re.compile(
    r"(?is)"
    r"<\s*script\b|"
    r"javascript\s*:|"
    r"vbscript\s*:|"
    r"data\s*:\s*text/html|"
    r"on\w+\s*="
)
_SCRIPT_BLOCK = re.compile(r"(?is)<\s*script\b[^>]*>.*?</\s*script\s*>")
_HTML_TAG = re.compile(r"<[^>]+>")
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")


def _normalizar_unicode(value: str) -> str:
    return unicodedata.normalize("NFKC", value)


def sanitize_text(value: str | None, *, max_length: int) -> str:
    """
    Remove controle/HTML, padroes maliciosos e limita tamanho.
    Mantem apenas texto seguro para campos CharField.
    """
    if value is None:
        return ""
    text = _normalizar_unicode(str(value)).strip()
    if not text:
        return ""
    text = _CONTROL_CHARS.sub("", text)
    text = _SCRIPT_BLOCK.sub("", text)
    text = _HTML_TAG.sub("", text)
    if _UNSAFE_PATTERNS.search(text):
        text = _UNSAFE_PATTERNS.sub("", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text[:max_length]


def sanitize_optional_text(value: str | None, max_length: int) -> str | None:
    if value is None:
        return None
    cleaned = sanitize_text(value, max_length=max_length)
    return cleaned if cleaned else None


def sanitize_email(value: str | None, *, max_length: int = 254) -> str:
    cleaned = sanitize_text(value, max_length=max_length)
    if not cleaned:
        return ""
    try:
        validate_email(cleaned)
    except ValidationError:
        return ""
    return cleaned.lower()


def sanitize_phone(value: str | None, *, max_length: int = 30) -> str:
    if value is None:
        return ""
    digits = re.sub(r"\D", "", str(value))
    if len(digits) < 10:
        return sanitize_text(value, max_length=max_length)
    if len(digits) == 10:
        formatted = f"({digits[:2]}) {digits[2:6]}-{digits[6:]}"
    elif len(digits) == 11:
        formatted = f"({digits[:2]}) {digits[2:7]}-{digits[7:]}"
    else:
        formatted = digits[:max_length]
    return formatted[:max_length]


def sanitize_uf(value: str | None) -> str:
    text = sanitize_text(value, max_length=2).upper()
    if len(text) == 2 and text.isalpha():
        return text
    return ""


def sanitize_cep(value: str | None) -> str:
    return re.sub(r"\D", "", sanitize_text(value, max_length=12))[:8]


def sanitize_cnae(value: str | None) -> str:
    return re.sub(r"\D", "", sanitize_text(value, max_length=10))[:7]
