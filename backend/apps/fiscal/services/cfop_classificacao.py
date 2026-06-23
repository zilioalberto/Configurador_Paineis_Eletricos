"""Regras CFOP → objetivo de saída, anexo Simples e flag «compõe faturamento» (RBT12).

Conceito «compõe faturamento»:
- Verdadeiro apenas para receita bruta tributável no Simples (venda, industrialização
  faturada, prestação de serviço).
- Falso para movimentações sem receita (remessa, retorno, transferência, devolução,
  bonificação, baixa de estoque etc.) e para CFOPs não mapeados (revisão manual).
"""
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

# Venda / faturamento de industrialização por encomenda (receita).
_CFOPS_INDUSTRIALIZACAO = {"5124", "6124"}

_CFOPS_SERVICO = {"5933", "6933"}

_CFOPS_DEVOLUCAO = {
    "5201",
    "5202",
    "5208",
    "5209",
    "5210",
    "5410",
    "5411",
    "5412",
    "5413",
    "6201",
    "6202",
    "6208",
    "6209",
    "6210",
    "6410",
    "6411",
    "6412",
    "6413",
}

_CFOPS_TRANSFERENCIA = {"5151", "5152", "5153", "5155", "5156", "6151", "6152", "6153", "6155", "6156"}

_CFOPS_BONIFICACAO = {"5910", "6910", "5911", "6911"}


def _pares_interestaduais(*codigos: str) -> frozenset[str]:
    """Inclui par 6xxx para cada código 5xxx informado."""
    resultado: set[str] = set()
    for codigo in codigos:
        resultado.add(codigo)
        if codigo.startswith("5") and len(codigo) == 4:
            resultado.add(f"6{codigo[1:]}")
    return frozenset(resultado)


# Remessas, retornos, consignação, amostras, baixas — sem receita para RBT12.
_CFOPS_MOVIMENTO_SEM_RECEITA = _pares_interestaduais(
    "5901",  # remessa p/ industrialização
    "5902",  # retorno de mercadoria usada na industrialização
    "5903",  # retorno de mercadoria recebida p/ industrialização
    "5904",  # remessa p/ venda fora do estabelecimento
    "5905",  # remessa p/ conserto/reparo
    "5906",  # retorno de mercadoria remetida p/ conserto
    "5907",  # retorno simbólico
    "5908",
    "5909",
    "5912",
    "5913",  # retorno de amostra grátis
    "5914",  # remessa p/ exportação
    "5915",
    "5916",  # retorno de consignação
    "5917",  # remessa de consignação
    "5918",  # devolução de consignação
    "5919",  # devolução simbólica
    "5920",  # remessa de vasilhame/embalagem
    "5921",  # devolução de vasilhame
    "5922",  # simples faturamento (ajuste — não somar de novo na RBT12)
    "5923",  # remessa p/ triangulação
    "5924",
    "5925",
    "5926",
    "5927",  # baixa de estoque
    "5928",
    "5929",
    "5931",  # perda
    "5932",  # retorno por recusa
    "5949",  # outra saída não especificada
)


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


def _sem_faturamento(
    *,
    objetivo: str,
    anexo: str = AnexoSimplesNacionalChoices.NENHUM,
) -> ClassificacaoCfop:
    return ClassificacaoCfop(
        objetivo_saida=objetivo,
        anexo_simples=anexo,
        incluir_faturamento=False,
    )


def classificar_cfop(cfop: str) -> ClassificacaoCfop:
    codigo = normalizar_cfop(cfop)
    if not codigo:
        return ClassificacaoCfop(
            objetivo_saida=ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS,
            anexo_simples="",
            incluir_faturamento=False,
        )

    if codigo in _CFOPS_DEVOLUCAO:
        return _sem_faturamento(objetivo=ObjetivoSaidaFiscalChoices.DEVOLUCAO_COMPRA)

    if codigo in _CFOPS_MOVIMENTO_SEM_RECEITA:
        return _sem_faturamento(objetivo=ObjetivoSaidaFiscalChoices.REMESSA)

    if codigo in _CFOPS_TRANSFERENCIA:
        return _sem_faturamento(objetivo=ObjetivoSaidaFiscalChoices.TRANSFERENCIA)

    if codigo in _CFOPS_BONIFICACAO:
        return _sem_faturamento(objetivo=ObjetivoSaidaFiscalChoices.BONIFICACAO_DOACAO_BRINDE)

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

    # CFOP não mapeado: não compõe até revisão manual (evita inflar RBT12).
    return ClassificacaoCfop(
        objetivo_saida=ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS,
        anexo_simples="",
        incluir_faturamento=False,
    )
