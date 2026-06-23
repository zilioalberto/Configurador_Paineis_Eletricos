"""Parser de guia ISS municipal."""
from __future__ import annotations

import re
from decimal import Decimal

from apps.fiscal.choices import TipoObrigacaoFiscalChoices

from ..pdf_util import parse_competencia_mes_ano, parse_data_br, parse_moeda_br


def _extrair_competencia_iss(texto: str) -> str | None:
    m_comp = re.search(r"Compet[eê]ncia\s*(\d{2}/\d{4})", texto, re.IGNORECASE)
    if m_comp:
        competencia = parse_competencia_mes_ano(m_comp.group(1))
        if competencia:
            return competencia
    return parse_competencia_mes_ano(texto)


def _extrair_valor_iss(texto: str):
    m_iss = re.search(r"Imposto Sobre Servi[cç]os:\s*R\$\s*([\d.,]+)", texto, re.IGNORECASE)
    if m_iss:
        valor = parse_moeda_br(m_iss.group(1))
        if valor is not None:
            return valor
    m_cobrado = re.search(r"\(=\)\s*VALOR COBRADO\s*([\d.,]+)", texto, re.IGNORECASE)
    if m_cobrado:
        return parse_moeda_br(m_cobrado.group(1))
    return None


def parse_iss(texto: str) -> dict:
    erros: list[str] = []
    competencia = _extrair_competencia_iss(texto)
    if not competencia:
        erros.append("Competência não identificada.")

    valor = _extrair_valor_iss(texto)
    if valor is None:
        erros.append("Valor ISS não identificado.")

    vencimento = None
    m_venc = re.search(r"VENCIMENTO\s*(\d{2}/\d{2}/\d{4})", texto, re.IGNORECASE)
    if m_venc:
        vencimento = parse_data_br(m_venc.group(1))

    nosso_numero = ""
    m_nn = re.search(r"NOSSO N[uú]MERO\s*(\d+)", texto, re.IGNORECASE)
    if m_nn:
        nosso_numero = m_nn.group(1)

    numero_nfse = ""
    m_nfse = re.search(r"NFS-e N[ºo°.]:\s*(\d+)", texto, re.IGNORECASE)
    if m_nfse:
        numero_nfse = m_nfse.group(1)

    tomador_cnpj = ""
    m_tom = re.search(r"Tomador:\s*([\d./\-]+)", texto, re.IGNORECASE)
    if m_tom:
        tomador_cnpj = re.sub(r"\D", "", m_tom.group(1))

    return {
        "tipo_obrigacao": TipoObrigacaoFiscalChoices.ISS,
        "tipo_anexo": "ISS",
        "competencia": competencia,
        "valor": str(valor or Decimal("0")),
        "data_vencimento": vencimento.isoformat() if vencimento else None,
        "numero_documento": nosso_numero,
        "descricao": f"ISS municipal — NFS-e {numero_nfse or '—'}",
        "linhas_composicao": [],
        "dados_extra": {
            "numero_nfse": numero_nfse,
            "tomador_cnpj": tomador_cnpj,
            "municipio": "Joinville" if "joinville" in texto.lower() else "",
        },
        "erros": erros,
        "sucesso": len(erros) == 0,
    }
