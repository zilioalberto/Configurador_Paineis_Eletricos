"""Regras CFOP → objetivo de saída e anexo do Simples Nacional."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.fiscal.choices import (
    AnexoSimplesNacionalChoices,
    ObjetivoSaidaFiscalChoices,
)

_CFOPS_VENDA = {
    "5101",
    "5102",
    "5103",
    "5104",
    "5105",
    "5106",
    "5109",
    "5110",
    "5111",
    "5112",
    "5113",
    "5114",
    "5115",
    "5116",
    "5117",
    "5118",
    "5119",
    "5120",
    "5122",
    "5123",
    "5401",
    "5402",
    "5403",
    "5405",
    "5651",
    "5652",
    "5653",
    "5654",
    "5655",
    "5656",
    "5667",
    "6101",
    "6102",
    "6103",
    "6104",
    "6105",
    "6106",
    "6109",
    "6110",
    "6111",
    "6112",
    "6113",
    "6114",
    "6115",
    "6116",
    "6117",
    "6118",
    "6119",
    "6120",
    "6122",
    "6123",
    "6401",
    "6402",
    "6403",
    "6404",
    "6651",
    "6652",
    "6653",
    "6654",
    "6655",
    "6656",
    "6667",
}

_CFOPS_INDUSTRIALIZACAO = {"5124", "6124"}

_CFOPS_SERVICO = {"5933", "6933"}

_CFOPS_DEVOLUCAO = {"5201", "5202", "5411", "6201", "6202", "6411"}

_CFOPS_REMESSA = {
    "5908",
    "6908",
    "5912",
    "6912",
    "5909",
    "6909",
    "5915",
    "6915",
    "5949",
    "6949",
}

_CFOPS_TRANSFERENCIA = {"5151", "5152", "6151", "6152"}

_CFOPS_BONIFICACAO = {"5910", "6910", "5911", "6911"}


@dataclass(frozen=True)
class ClassificacaoCfop:
    objetivo_saida: str
    anexo_simples: str
    incluir_faturamento: bool


def normalizar_cfop(cfop: str) -> str:
    return "".join(ch for ch in (cfop or "") if ch.isdigit())[:4]


def cfop_predominante_por_itens(itens: list) -> str:
    """Retorna o CFOP com maior valor total entre os itens."""
    totais: dict[str, Decimal] = {}
    for item in itens:
        cfop_raw = getattr(item, "cfop", None)
        if cfop_raw is None and isinstance(item, dict):
            cfop_raw = item.get("cfop", "")
        cfop = normalizar_cfop(cfop_raw or "")
        if not cfop:
            continue
        valor = getattr(item, "valor_total", None)
        if valor is None and isinstance(item, dict):
            valor = item.get("valor_total", 0)
        totais[cfop] = totais.get(cfop, Decimal("0")) + Decimal(str(valor or 0))
    if not totais:
        return ""
    return max(totais.items(), key=lambda row: row[1])[0]


def classificar_cfop(cfop: str) -> ClassificacaoCfop:
    codigo = normalizar_cfop(cfop)
    if not codigo:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS,
            anexo_simples="",
            incluir_faturamento=True,
        )
    if codigo in _CFOPS_DEVOLUCAO:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.DEVOLUCAO_COMPRA,
            anexo_simples=AnexoSimplesNacionalChoices.NENHUM,
            incluir_faturamento=False,
        )
    if codigo in _CFOPS_REMESSA:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.REMESSA,
            anexo_simples=AnexoSimplesNacionalChoices.NENHUM,
            incluir_faturamento=False,
        )
    if codigo in _CFOPS_TRANSFERENCIA:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.TRANSFERENCIA,
            anexo_simples=AnexoSimplesNacionalChoices.NENHUM,
            incluir_faturamento=False,
        )
    if codigo in _CFOPS_BONIFICACAO:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.BONIFICACAO_DOACAO_BRINDE,
            anexo_simples=AnexoSimplesNacionalChoices.NENHUM,
            incluir_faturamento=False,
        )
    if codigo in _CFOPS_INDUSTRIALIZACAO:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.INDUSTRIALIZACAO,
            anexo_simples=AnexoSimplesNacionalChoices.II,
            incluir_faturamento=True,
        )
    if codigo in _CFOPS_SERVICO:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.PRESTACAO_SERVICO,
            anexo_simples="",
            incluir_faturamento=True,
        )
    if codigo in _CFOPS_VENDA:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.VENDA_PRODUTO,
            anexo_simples=AnexoSimplesNacionalChoices.I,
            incluir_faturamento=True,
        )
    if codigo[0] in {"5", "6", "7"}:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS,
            anexo_simples="",
            incluir_faturamento=True,
        )
    return ClassificacaoCfop(
        objetivo_saida=ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS,
        anexo_simples="",
        incluir_faturamento=True,
    )
