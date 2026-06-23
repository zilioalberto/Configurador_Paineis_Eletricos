"""Parser de DIME / demonstrativo ICMS SC."""
from __future__ import annotations

import re
from decimal import Decimal

from apps.fiscal.choices import TipoObrigacaoFiscalChoices

from ..pdf_util import parse_competencia_mes_ano, parse_moeda_br


def _normalizar_texto_dime(texto: str) -> str:
    """Corrige quebras comuns de extração PDF (ex.: 'V alor' → 'Valor')."""
    s = texto or ""
    s = re.sub(r"V\s+alor", "Valor", s, flags=re.IGNORECASE)
    s = re.sub(r"Cont[aá]bil", "Contábil", s, flags=re.IGNORECASE)
    s = re.sub(r"D[eé]bito", "Débito", s, flags=re.IGNORECASE)
    s = re.sub(r"Cr[eé]dito", "Crédito", s, flags=re.IGNORECASE)
    return s


def _extrair_valor_sequencia(texto: str, sequencia: str, descricao_fragmento: str) -> Decimal | None:
    texto_norm = _normalizar_texto_dime(texto)
    padrao = rf"(?<!\d){sequencia}\s+.*?{descricao_fragmento}\s+([\d.,]+)"
    m = re.search(padrao, texto_norm, re.IGNORECASE | re.DOTALL)
    if m:
        return parse_moeda_br(m.group(1))
    return None


def _extrair_valor_contabil_quadro03(texto: str, sequencia: str) -> Decimal | None:
    """Extrai '010 Valor Contábil' / '060 Valor Contábil' do Quadro 03."""
    texto_norm = _normalizar_texto_dime(texto)
    padrao = rf"(?<!\d){sequencia}\s+Valor\s+Cont[aá]bil\s+([\d.,]+)"
    m = re.search(padrao, texto_norm, re.IGNORECASE)
    if m:
        return parse_moeda_br(m.group(1))
    return None


def parse_dime_icms(texto: str) -> dict:
    erros: list[str] = []
    competencia = None
    m_periodo = re.search(r"Per[ií]odo:\s*\d{2}/\d{2}/(\d{4}).*?a\s*\d{2}/(\d{2})/\d{4}", texto)
    if m_periodo:
        competencia = f"{m_periodo.group(1)}-{m_periodo.group(2)}"
    if not competencia:
        m_ref = re.search(r"Per[ií]odo de refer[eê]ncia da declara[cç][aã]o\s+(\d{2}/\d{4})", texto)
        if m_ref:
            competencia = parse_competencia_mes_ano(m_ref.group(1))
    if not competencia:
        competencia = parse_competencia_mes_ano(texto)
    if not competencia:
        erros.append("Competência não identificada.")

    valor_contabil_entradas = _extrair_valor_contabil_quadro03(texto, "010")
    valor_contabil_saidas = _extrair_valor_contabil_quadro03(texto, "060")

    snapshot = {
        "saldo_credor_anterior": _extrair_valor_sequencia(texto, "010", "Saldo credor do m[eê]s anterior"),
        "debitos_saidas": _extrair_valor_sequencia(texto, "010", "D[eé]bito pelas sa[ií]das"),
        "creditos_entradas": _extrair_valor_sequencia(texto, "020", "Cr[eé]dito pelas entradas"),
        "total_debitos": _extrair_valor_sequencia(texto, "990", "Subtotal de [Dd][eé]bitos"),
        "total_creditos": _extrair_valor_sequencia(texto, "990", "Subtotal de cr[eé]ditos"),
        "saldo_credor": _extrair_valor_sequencia(texto, "140", "Saldo Credor"),
        "imposto_a_recolher": _extrair_valor_sequencia(texto, "999", "Imposto a recolher"),
        "valor_contabil_entradas": valor_contabil_entradas,
        "valor_contabil_saidas": valor_contabil_saidas,
    }

    valor_obrigacao = snapshot["imposto_a_recolher"] or Decimal("0")
    if snapshot["imposto_a_recolher"] is None and snapshot["saldo_credor"]:
        valor_obrigacao = Decimal("0")

    if valor_contabil_entradas is None or valor_contabil_saidas is None:
        erros.append("Valor contábil entradas/saídas não identificado no Quadro 03.")

    return {
        "tipo_obrigacao": TipoObrigacaoFiscalChoices.ICMS,
        "tipo_anexo": "DIME_ICMS",
        "competencia": competencia,
        "valor": str(valor_obrigacao),
        "data_vencimento": None,
        "numero_documento": "",
        "descricao": "ICMS — apuração DIME (SC)",
        "linhas_composicao": [],
        "snapshot_icms": {k: str(v) for k, v in snapshot.items() if v is not None},
        "dados_extra": {"regime": "normal"},
        "erros": erros,
        "sucesso": len(erros) == 0,
    }
