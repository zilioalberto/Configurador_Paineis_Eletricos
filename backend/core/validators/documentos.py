"""
Validadores de documentos brasileiros (CNPJ, etc.).
"""
from __future__ import annotations

import re


class DocumentoInvalidoError(ValueError):
    """Documento com formato ou digitos verificadores invalidos."""


def _apenas_digitos(raw: str) -> str:
    return re.sub(r"\D", "", raw or "")


def _calcular_digito_cnpj(base: str, pesos: tuple[int, ...]) -> int:
    soma = sum(int(d) * p for d, p in zip(base, pesos, strict=True))
    resto = soma % 11
    return 0 if resto < 2 else 11 - resto


def validar_cnpj_digitos(cnpj: str) -> str:
    """
    Valida CNPJ (14 digitos + digitos verificadores).
    Retorna os digitos normalizados ou levanta DocumentoInvalidoError.
    """
    digits = _apenas_digitos(cnpj)
    if len(digits) != 14:
        raise DocumentoInvalidoError("CNPJ deve conter 14 digitos.")

    if digits == digits[0] * 14:
        raise DocumentoInvalidoError("CNPJ invalido.")

    base = digits[:12]
    primeiro = _calcular_digito_cnpj(base, (5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2))
    segundo = _calcular_digito_cnpj(base + str(primeiro), (6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2))

    expected = f"{primeiro}{segundo}"
    if not digits.endswith(expected):
        raise DocumentoInvalidoError("CNPJ invalido (digitos verificadores).")

    return digits


def validar_cpf_digitos(cpf: str) -> str:
    """Valida CPF (11 digitos + digitos verificadores)."""
    digits = _apenas_digitos(cpf)
    if len(digits) != 11:
        raise DocumentoInvalidoError("CPF deve conter 11 digitos.")

    if digits == digits[0] * 11:
        raise DocumentoInvalidoError("CPF invalido.")

    primeiro = _calcular_digito_cnpj(digits[:9], (10, 9, 8, 7, 6, 5, 4, 3, 2))
    segundo = _calcular_digito_cnpj(digits[:10], (11, 10, 9, 8, 7, 6, 5, 4, 3, 2))

    expected = f"{primeiro}{segundo}"
    if not digits.endswith(expected):
        raise DocumentoInvalidoError("CPF invalido (digitos verificadores).")

    return digits
