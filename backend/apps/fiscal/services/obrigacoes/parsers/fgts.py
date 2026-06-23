"""Parser de guia FGTS Digital."""
from __future__ import annotations

import re
from datetime import date
from decimal import Decimal

from apps.fiscal.choices import TipoObrigacaoFiscalChoices

from ..pdf_util import parse_competencia_mes_ano, parse_data_br, parse_moeda_br


def _parse_competencia_fgts(texto: str) -> str | None:
    m_tag = re.search(r"FGTS\s+(\d{2}/\d{4})", texto, re.IGNORECASE)
    if m_tag:
        return parse_competencia_mes_ano(m_tag.group(1))
    return parse_competencia_mes_ano(texto)


def _parse_valor_fgts(texto: str) -> Decimal | None:
    m_valor = re.search(r"Valor a recolher\s*([\d.,]+)", texto, re.IGNORECASE)
    if m_valor:
        return parse_moeda_br(m_valor.group(1))

    m_total = re.search(r"Total da Guia:\s*([\d.,]+)", texto, re.IGNORECASE)
    if m_total:
        return parse_moeda_br(m_total.group(1))

    return None


def _parse_vencimento_fgts(texto: str) -> date | None:
    m_venc = re.search(
        r"Pagar este documento at[eé]\s*(\d{2}/\d{2}/\d{4})",
        texto,
        re.IGNORECASE,
    )
    if m_venc:
        return parse_data_br(m_venc.group(1))
    return None


def _parse_qtd_trabalhadores(texto: str) -> int | None:
    cauda_trab = (texto.split("Trabalhadores")[-1][:40] if "Trabalhadores" in texto else "").rstrip()
    digitos_finais = ""
    for caractere in reversed(cauda_trab):
        if not caractere.isdigit():
            break
        digitos_finais = caractere + digitos_finais
    if digitos_finais:
        return int(digitos_finais)
    return None


def _parse_identificador_fgts(texto: str) -> str:
    m_id = re.search(r"Identificador\s*([\d\-]+)", texto, re.IGNORECASE)
    if m_id:
        return m_id.group(1).strip()
    return ""


def parse_fgts(texto: str) -> dict:
    erros: list[str] = []
    competencia = _parse_competencia_fgts(texto)
    valor = _parse_valor_fgts(texto)
    vencimento = _parse_vencimento_fgts(texto)

    if not competencia:
        erros.append("Competência não identificada.")
    if valor is None:
        erros.append("Valor FGTS não identificado.")

    return {
        "tipo_obrigacao": TipoObrigacaoFiscalChoices.FGTS,
        "tipo_anexo": "FGTS",
        "competencia": competencia,
        "valor": str(valor or Decimal("0")),
        "data_vencimento": vencimento.isoformat() if vencimento else None,
        "numero_documento": _parse_identificador_fgts(texto),
        "descricao": "FGTS Digital",
        "linhas_composicao": [],
        "dados_extra": {"quantidade_trabalhadores": _parse_qtd_trabalhadores(texto)},
        "erros": erros,
        "sucesso": len(erros) == 0,
    }


