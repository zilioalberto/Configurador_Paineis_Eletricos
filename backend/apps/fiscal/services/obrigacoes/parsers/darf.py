"""Parser de DARF (INSS patronal / contribuições)."""
from __future__ import annotations

import re
from decimal import Decimal

from apps.fiscal.choices import TipoObrigacaoFiscalChoices

from ..pdf_util import parse_competencia_mes_ano, parse_data_br, parse_moeda_br


CODIGOS_INSS_DARF = {"1082", "1099", "1138", "0561"}


def _extrair_competencia_darf(texto: str) -> str | None:
    m_pa = re.search(r"PA:\s*(\d{2}/\d{4})", texto, re.IGNORECASE)
    if m_pa:
        competencia = parse_competencia_mes_ano(m_pa.group(1))
        if competencia:
            return competencia
    m_per = re.search(r"Per[ií]odo de Apura[cç][aã]o", texto, re.IGNORECASE)
    if m_per:
        competencia = parse_competencia_mes_ano(texto[m_per.start() : m_per.start() + 80])
        if competencia:
            return competencia
    return parse_competencia_mes_ano(texto)


def _extrair_valor_total_darf(texto: str):
    m_valor = re.search(r"Valor Total do Documento\s*([\d.,]+)", texto, re.IGNORECASE)
    if m_valor:
        valor = parse_moeda_br(m_valor.group(1))
        if valor is not None:
            return valor
    m_tot = re.search(r"Totais\s+([\d.,]+)", texto, re.IGNORECASE)
    if m_tot:
        return parse_moeda_br(m_tot.group(1))
    return None


def _extrair_linha_darf(linha: str) -> dict | None:
    m_cod = re.match(r"\s*(\d{4})\s+(.*)", linha)
    if not m_cod:
        return None
    codigo = m_cod.group(1)
    if codigo not in CODIGOS_INSS_DARF:
        return None
    resto = m_cod.group(2)
    numeros = re.findall(r"[\d.,]+", resto)
    if len(numeros) < 2:
        return None
    m_num = re.search(r"[\d.,]+", resto)
    descricao = resto[: m_num.start()].strip() if m_num else resto.strip()
    valor = parse_moeda_br(numeros[-1]) or parse_moeda_br(numeros[-2])
    if valor is None:
        return None
    return {"codigo": codigo, "descricao": descricao, "valor": str(valor)}


def parse_darf(texto: str) -> dict:
    erros: list[str] = []
    competencia = _extrair_competencia_darf(texto)
    if not competencia:
        erros.append("Competência não identificada.")

    valor_total = _extrair_valor_total_darf(texto)
    if valor_total is None:
        erros.append("Valor total não identificado.")

    vencimento = None
    m_venc = re.search(
        r"Pagar (?:este documento )?at[eé]\s*(\d{2}/\d{2}/\d{4})",
        texto,
        re.IGNORECASE,
    )
    if m_venc:
        vencimento = parse_data_br(m_venc.group(1))

    numero_doc = ""
    m_num = re.search(r"N[uú]mero(?: do Documento)?:?\s*([\d.\-]+)", texto, re.IGNORECASE)
    if m_num:
        numero_doc = m_num.group(1).strip()

    linhas: list[dict] = [
        linha for linha in (_extrair_linha_darf(l) for l in texto.splitlines()) if linha
    ]

    return {
        "tipo_obrigacao": TipoObrigacaoFiscalChoices.INSS_DARF,
        "tipo_anexo": "DARF",
        "competencia": competencia,
        "valor": str(valor_total or Decimal("0")),
        "data_vencimento": vencimento.isoformat() if vencimento else None,
        "numero_documento": numero_doc,
        "descricao": "INSS — DARF",
        "linhas_composicao": linhas,
        "dados_extra": {"texto_resumo": "DARF INSS"},
        "erros": erros,
        "sucesso": len(erros) == 0,
    }
