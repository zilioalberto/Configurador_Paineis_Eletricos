"""Parser de holerites / demonstrativos de pagamento."""
from __future__ import annotations

import re
from decimal import Decimal

from apps.fiscal.choices import TipoHoleriteFiscalChoices
from apps.fiscal.services.obrigacoes.holerites_rh import limpar_nome_holerite

from ..pdf_util import parse_competencia_mes_ano, parse_cpf, parse_moeda_br


def _extrair_nome_bloco(bloco: str) -> str:
    padroes = (
        r"\n\s*\d+\s+([A-ZÀ-Üa-zà-ü][A-ZÀ-Üa-zà-ü\s\.]{2,}?)\s+\d{6}\s+\d",
        r"\n\s*\d+\s+([A-ZÀ-Üa-zà-ü\s\.]+?)\s+\d{6}\s",
        r"Nome do Funcion[aá]rio\s+([A-ZÀ-Üa-zà-ü][A-ZÀ-Üa-zà-ü\s\.]{2,}?)\s+CBO",
    )
    for padrao in padroes:
        nome_m = re.search(padrao, bloco, re.IGNORECASE)
        if nome_m:
            nome = limpar_nome_holerite(nome_m.group(1))
            if len(nome) >= 3 and not nome.isdigit():
                return nome
    return "Colaborador"


def _parse_bloco_holerite(bloco: str) -> dict | None:
    cpf_m = re.search(r"CPF:\s*([\d.\-/]+)", bloco)
    if not cpf_m:
        return None
    nome = _extrair_nome_bloco(bloco)
    cpf = parse_cpf(cpf_m.group(1))

    proventos = Decimal("0")
    desconto_inss = Decimal("0")
    if re.search(r"Pro-Labore", bloco, re.IGNORECASE):
        tipo = TipoHoleriteFiscalChoices.PRO_LABORE
    elif re.search(r"Horas Normais|Sal[aá]rio", bloco, re.IGNORECASE):
        tipo = TipoHoleriteFiscalChoices.CLT
    else:
        tipo = TipoHoleriteFiscalChoices.OUTRO

    m_total = re.search(r"Total\s+([\d.,]+)\s+([\d.,]+)", bloco)
    if m_total:
        proventos = parse_moeda_br(m_total.group(1)) or Decimal("0")
        desconto_inss = parse_moeda_br(m_total.group(2)) or Decimal("0")

    m_inss = re.search(r"950 INSS\s+[\d.,]+\s*%\s+([\d.,]+)", bloco)
    if m_inss:
        desconto_inss = parse_moeda_br(m_inss.group(1)) or desconto_inss

    m_base = re.search(r"Bas C[aá]lc FGTS\s+([\d.,]+)", bloco)
    base_fgts = parse_moeda_br(m_base.group(1)) if m_base else Decimal("0")
    m_fgts = re.search(r"FGTS M[eê]s\s+([\d.,]+)", bloco)
    fgts_mes = Decimal("0")
    if m_fgts:
        fgts_mes = parse_moeda_br(m_fgts.group(1)) or Decimal("0")
    else:
        linhas = bloco.splitlines()
        for idx, linha in enumerate(linhas):
            if "FGTS M" in linha and idx + 1 < len(linhas):
                cols = linhas[idx + 1].split()
                if len(cols) >= 4:
                    fgts_mes = parse_moeda_br(cols[3]) or Decimal("0")
                break
    m_liq = re.search(r"([\d.,]{1,20})\s{0,12}Total L[ií]quido", bloco)
    liquido = parse_moeda_br(m_liq.group(1)) if m_liq else None

    return {
        "cpf": cpf,
        "nome": nome,
        "tipo": tipo,
        "proventos": str(proventos),
        "desconto_inss": str(desconto_inss),
        "base_fgts": str(base_fgts or Decimal("0")),
        "fgts_mes": str(fgts_mes or Decimal("0")),
        "total_liquido": str(liquido) if liquido is not None else None,
    }


def parse_holerites(texto: str) -> dict:
    erros: list[str] = []
    competencia = parse_competencia_mes_ano(texto)
    if not competencia:
        erros.append("Competência não identificada.")

    blocos = re.split(r"Demonstrativo de Pagamento", texto, flags=re.IGNORECASE)
    holerites: list[dict] = []
    vistos: set[str] = set()
    for bloco in blocos[1:]:
        item = _parse_bloco_holerite(bloco[:2500])
        if not item:
            continue
        chave = item["cpf"] or item["nome"]
        if chave in vistos:
            continue
        vistos.add(chave)
        holerites.append(item)

    if not holerites:
        erros.append("Nenhum holerite identificado.")

    return {
        "tipo_obrigacao": None,
        "tipo_anexo": "HOLERITE",
        "competencia": competencia,
        "valor": None,
        "data_vencimento": None,
        "numero_documento": "",
        "descricao": f"Holerites ({len(holerites)} colaborador(es))",
        "linhas_composicao": [],
        "holerites": holerites,
        "dados_extra": {"quantidade": len(holerites)},
        "erros": erros,
        "sucesso": len(holerites) > 0,
    }
