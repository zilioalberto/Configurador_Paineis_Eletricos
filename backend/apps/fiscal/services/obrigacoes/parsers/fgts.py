"""Parser de guia FGTS Digital."""
from __future__ import annotations

import re
from decimal import Decimal

from apps.fiscal.choices import TipoObrigacaoFiscalChoices

from ..pdf_util import parse_competencia_mes_ano, parse_data_br, parse_moeda_br


def parse_fgts(texto: str) -> dict:
    erros: list[str] = []
    competencia = None
    m_tag = re.search(r"FGTS\s+(\d{2}/\d{4})", texto, re.IGNORECASE)
    if m_tag:
        competencia = parse_competencia_mes_ano(m_tag.group(1))
    if not competencia:
        competencia = parse_competencia_mes_ano(texto)
    if not competencia:
        erros.append("Competência não identificada.")

    valor = None
    m_valor = re.search(r"Valor a recolher\s*([\d.,]+)", texto, re.IGNORECASE)
    if m_valor:
        valor = parse_moeda_br(m_valor.group(1))
    if valor is None:
        m_total = re.search(r"Total da Guia:\s*([\d.,]+)", texto, re.IGNORECASE)
        if m_total:
            valor = parse_moeda_br(m_total.group(1))
    if valor is None:
        erros.append("Valor FGTS não identificado.")

    vencimento = None
    m_venc = re.search(
        r"Pagar este documento at[eé]\s*(\d{2}/\d{2}/\d{4})",
        texto,
        re.IGNORECASE,
    )
    if m_venc:
        vencimento = parse_data_br(m_venc.group(1))

    qtd_trabalhadores = None
    cauda_trab = (texto.split("Trabalhadores")[-1][:40] if "Trabalhadores" in texto else "").rstrip()
    digitos_finais = ""
    for caractere in reversed(cauda_trab):
        if not caractere.isdigit():
            break
        digitos_finais = caractere + digitos_finais
    if digitos_finais:
        qtd_trabalhadores = int(digitos_finais)

    identificador = ""
    m_id = re.search(r"Identificador\s*([\d\-]+)", texto, re.IGNORECASE)
    if m_id:
        identificador = m_id.group(1).strip()

    return {
        "tipo_obrigacao": TipoObrigacaoFiscalChoices.FGTS,
        "tipo_anexo": "FGTS",
        "competencia": competencia,
        "valor": str(valor or Decimal("0")),
        "data_vencimento": vencimento.isoformat() if vencimento else None,
        "numero_documento": identificador,
        "descricao": "FGTS Digital",
        "linhas_composicao": [],
        "dados_extra": {"quantidade_trabalhadores": qtd_trabalhadores},
        "erros": erros,
        "sucesso": len(erros) == 0,
    }
