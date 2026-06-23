"""Parser de demonstrativo / guia Simples Nacional (DAS)."""
from __future__ import annotations

import re
from decimal import Decimal

from apps.fiscal.choices import TipoObrigacaoFiscalChoices

from ..pdf_util import parse_competencia_mes_ano, parse_data_br, parse_moeda_br

CODIGOS_COMPOSICAO_SIMPLES = frozenset(
    {
        "1001",
        "1002",
        "1004",
        "1005",
        "1006",
        "1007",
        "1008",
        "1010",
        "1011",
        "1012",
    }
)


def _extrair_competencia(texto: str) -> str | None:
    m_mes = re.search(
        r"(Janeiro|Fevereiro|Mar[cç]o|Abril|Maio|Junho|Julho|Agosto|Setembro|Outubro|Novembro|Dezembro)\s*/\s*(\d{4})",
        texto,
        re.IGNORECASE,
    )
    if m_mes:
        return parse_competencia_mes_ano(f"{m_mes.group(1)}/{m_mes.group(2)}")

    m_apur = re.search(
        r"Per[ií]odo de Apura[cç][aã]o[^\n]{0,80}?(\d{2}/\d{4})",
        texto,
        re.IGNORECASE | re.DOTALL,
    )
    if m_apur:
        return parse_competencia_mes_ano(m_apur.group(1))

    return parse_competencia_mes_ano(texto)


def _extrair_valor_das(texto: str) -> Decimal | None:
    padroes = (
        r"Valor Total do Documento\s*R?\$?\s*([\d.,]+)",
        r"Valor Total do Documento\s*\n\s*([\d.,]+)",
        r"Valor Total do DAS\s*R?\$?\s*([\d.,]+)",
        r"Valor Total do DAS\s*\n\s*([\d.,]+)",
        r"Total a Pagar\s*R?\$?\s*([\d.,]+)",
        r"Valor do Documento\s*([\d.,]+)",
        r"Valor:\s*([\d.,]+)",
        r"Totais\s+([\d.,]+)\s+[\d.,]+",
    )
    for padrao in padroes:
        m = re.search(padrao, texto, re.IGNORECASE)
        if m:
            valor = parse_moeda_br(m.group(1))
            if valor is not None:
                return valor
    return None


def _extrair_linhas_composicao(texto: str) -> list[dict]:
    linhas: list[dict] = []
    codigos = "|".join(sorted(CODIGOS_COMPOSICAO_SIMPLES))
    for m_linha in re.finditer(
        rf"({codigos})\s+(.+?)\s+([\d.,]+)\s+([\d.,]+)",
        texto,
    ):
        codigo = m_linha.group(1)
        descricao = m_linha.group(2).strip()
        valor = parse_moeda_br(m_linha.group(4)) or parse_moeda_br(m_linha.group(3))
        if valor is None:
            continue
        linhas.append({"codigo": codigo, "descricao": descricao, "valor": str(valor)})
    return linhas


def parse_simples(texto: str) -> dict:
    erros: list[str] = []
    competencia = _extrair_competencia(texto)
    if not competencia:
        erros.append("Competência não identificada.")

    valor = _extrair_valor_das(texto)
    if valor is None:
        erros.append("Valor DAS não identificado (PDF pode ser imagem — informe manualmente).")

    vencimento = None
    m_venc = re.search(r"Vencimento\s*(\d{2}/\d{2}/\d{4})", texto, re.IGNORECASE)
    if not m_venc:
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

    m_rbt = re.search(r"Receita Bruta[^\d]*([\d.,]+)", texto, re.IGNORECASE)
    rbt = parse_moeda_br(m_rbt.group(1)) if m_rbt else None

    linhas_composicao = _extrair_linhas_composicao(texto)

    return {
        "tipo_obrigacao": TipoObrigacaoFiscalChoices.DAS,
        "tipo_anexo": "SIMPLES",
        "competencia": competencia,
        "valor": str(valor or Decimal("0")),
        "data_vencimento": vencimento.isoformat() if vencimento else None,
        "numero_documento": numero_doc,
        "descricao": "DAS — Simples Nacional",
        "linhas_composicao": linhas_composicao,
        "dados_extra": {
            "receita_bruta": str(rbt) if rbt is not None else None,
            "composicao_tributos": len(linhas_composicao),
        },
        "erros": erros,
        "sucesso": valor is not None and competencia is not None,
    }
