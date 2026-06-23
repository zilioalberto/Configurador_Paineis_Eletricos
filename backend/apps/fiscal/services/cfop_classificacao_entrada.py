"""Regras CFOP de entrada (1xxx/2xxx/3xxx) → objetivo da entrada.

Espelha `cfop_classificacao.py` (saída), mas para notas recebidas. O objetivo é
sugerir automaticamente a destinação da mercadoria (industrialização, revenda,
uso/consumo, ativo etc.) a partir do CFOP de cada item, com revisão manual depois.

Convenção de CFOP de entrada:
- 1xxx: operação dentro do estado
- 2xxx: operação interestadual
- 3xxx: importação (exterior)
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal

from apps.fiscal.choices import ObjetivoEntradaFiscalChoices


def _pares(*codigos: str) -> set[str]:
    """Para cada CFOP 1xxx informado, inclui também o par interestadual 2xxx."""
    resultado: set[str] = set()
    for codigo in codigos:
        resultado.add(codigo)
        if codigo.startswith("1") and len(codigo) == 4:
            resultado.add(f"2{codigo[1:]}")
    return resultado


# Compra de insumo/matéria-prima para industrializar.
_CFOPS_INDUSTRIALIZACAO = _pares(
    "1101",  # compra para industrialização ou produção
    "1111",  # compra p/ industrialização de mercadoria recebida em consignação industrial
    "1116",  # compra p/ industrialização originada de encomenda p/ recebimento futuro
    "1120",  # compra p/ industrialização, em venda à ordem
    "1122",  # compra p/ industrialização em que a mercadoria foi recebida do vendedor remetente
    "1126",  # compra p/ utilização na prestação de serviço sujeita ao ICMS
    "1128",  # compra p/ utilização na prestação de serviço sujeita ao ISSQN
    "1401",  # compra p/ industrialização com mercadoria sujeita a ST
    "1901",  # entrada para industrialização por encomenda
    "1903",  # entrada de mercadoria remetida p/ industrialização e não aplicada
)

# Compra de mercadoria para revenda/comercialização.
_CFOPS_REVENDA = _pares(
    "1102",  # compra para comercialização
    "1113",  # compra p/ comercialização de mercadoria recebida em consignação mercantil
    "1117",  # compra p/ comercialização originada de encomenda p/ recebimento futuro
    "1118",  # compra de mercadoria p/ comercialização pelo adquirente originário (venda à ordem)
    "1403",  # compra p/ comercialização com mercadoria sujeita a ST
)

# Material de uso e consumo.
_CFOPS_USO_CONSUMO = _pares(
    "1556",  # compra de material para uso ou consumo
    "1407",  # compra de material p/ uso/consumo com mercadoria sujeita a ST
)

# Bem para o ativo imobilizado.
_CFOPS_ATIVO_IMOBILIZADO = _pares(
    "1551",  # compra de bem para o ativo imobilizado
    "1406",  # compra de bem p/ ativo com mercadoria sujeita a ST
)

# Devolução de venda (cliente devolvendo o que vendemos).
_CFOPS_DEVOLUCAO_VENDA = _pares(
    "1201",  # devolução de venda de produção do estabelecimento
    "1202",  # devolução de venda de mercadoria adquirida ou recebida de terceiros
    "1203",  # devolução de venda de produção sujeita a ST
    "1204",  # devolução de venda de mercadoria sujeita a ST
    "1206",
    "1207",
    "1208",
    "1209",
    "1210",
    "1212",
    "1213",
    "1410",  # devolução de venda de produção sujeita a ST
    "1411",  # devolução de venda de mercadoria sujeita a ST
)

# Retorno de mercadoria que enviamos para industrialização por terceiros.
_CFOPS_RETORNO_INDUSTRIALIZACAO = _pares(
    "1124",  # industrialização efetuada por outra empresa
    "1125",  # industrialização efetuada por outra empresa, mercadoria não transitou
    "1902",  # retorno de mercadoria remetida p/ industrialização por encomenda
)

# Retorno de mercadoria/bem enviado para conserto ou reparo.
_CFOPS_RETORNO_CONSERTO = _pares(
    "1915",  # entrada de mercadoria/bem recebido p/ conserto ou reparo
    "1916",  # retorno de mercadoria/bem remetido p/ conserto ou reparo
)

# Transferências entre estabelecimentos da mesma empresa.
_CFOPS_TRANSFERENCIA = _pares(
    "1151",  # transferência para industrialização
    "1152",  # transferência de mercadoria adquirida ou recebida de terceiros
    "1153",  # transferência de produção sujeita a ST
    "1408",  # transferência p/ industrialização sujeita a ST
    "1409",  # transferência p/ comercialização sujeita a ST
    "1552",  # transferência de bem do ativo imobilizado
    "1557",  # transferência de material para uso ou consumo
)

_CFOPS_BONIFICACAO = _pares("1910")  # entrada de bonificação, doação ou brinde
_CFOPS_AMOSTRA = _pares("1911")  # entrada de amostra grátis
_CFOPS_COMODATO = _pares("1908", "1909")  # comodato/empréstimo
_CFOPS_DEMONSTRACAO = _pares("1912", "1913", "1914")  # demonstração/exposição


@dataclass(frozen=True)
class ClassificacaoCfopEntrada:
    objetivo_entrada: str


def normalizar_cfop(cfop: str) -> str:
    return "".join(ch for ch in (cfop or "") if ch.isdigit())[:4]


def cfop_predominante_por_itens(itens: list) -> str:
    """Retorna o CFOP com maior valor total somado entre os itens."""
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


def classificar_cfop_entrada(cfop: str) -> ClassificacaoCfopEntrada:
    """Mapeia um CFOP de entrada para o objetivo da entrada (com fallback manual)."""
    codigo = normalizar_cfop(cfop)
    if not codigo:
        return ClassificacaoCfopEntrada(ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS)

    # Importação: todo 3xxx, salvo quando há regra mais específica adiante.
    if codigo.startswith("3"):
        return ClassificacaoCfopEntrada(ObjetivoEntradaFiscalChoices.IMPORTACAO)

    regras: list[tuple[set[str], str]] = [
        (_CFOPS_DEVOLUCAO_VENDA, ObjetivoEntradaFiscalChoices.DEVOLUCAO_VENDA),
        (_CFOPS_RETORNO_INDUSTRIALIZACAO, ObjetivoEntradaFiscalChoices.RETORNO_INDUSTRIALIZACAO),
        (_CFOPS_RETORNO_CONSERTO, ObjetivoEntradaFiscalChoices.RETORNO_CONSERTO_REPARO),
        (_CFOPS_TRANSFERENCIA, ObjetivoEntradaFiscalChoices.TRANSFERENCIA),
        (_CFOPS_BONIFICACAO, ObjetivoEntradaFiscalChoices.BONIFICACAO_DOACAO_BRINDE),
        (_CFOPS_AMOSTRA, ObjetivoEntradaFiscalChoices.AMOSTRA_GRATIS),
        (_CFOPS_COMODATO, ObjetivoEntradaFiscalChoices.COMODATO_EMPRESTIMO),
        (_CFOPS_DEMONSTRACAO, ObjetivoEntradaFiscalChoices.DEMONSTRACAO),
        (_CFOPS_ATIVO_IMOBILIZADO, ObjetivoEntradaFiscalChoices.ATIVO_IMOBILIZADO),
        (_CFOPS_USO_CONSUMO, ObjetivoEntradaFiscalChoices.USO_CONSUMO),
        (_CFOPS_INDUSTRIALIZACAO, ObjetivoEntradaFiscalChoices.INDUSTRIALIZACAO),
        (_CFOPS_REVENDA, ObjetivoEntradaFiscalChoices.REVENDA),
    ]
    for conjunto, objetivo in regras:
        if codigo in conjunto:
            return ClassificacaoCfopEntrada(objetivo)

    return ClassificacaoCfopEntrada(ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS)


def objetivo_entrada_predominante(itens: list) -> str:
    """Objetivo de entrada do CFOP de maior valor total entre os itens."""
    cfop = cfop_predominante_por_itens(itens)
    if not cfop:
        return ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS
    return classificar_cfop_entrada(cfop).objetivo_entrada
