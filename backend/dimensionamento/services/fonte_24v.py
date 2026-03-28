"""
Estimativa de corrente na fonte 24 Vcc de comando.

Valores conservadores para dimensionamento preliminar; ajuste conforme
regra interna da empresa ou catálogo de I/O / PLC.
"""
from __future__ import annotations

from decimal import Decimal

from .comando import calcular_necessita_fonte_24vcc


# Consumo base (PLC + IHM/supervisão mínima quando houver PLC)
BASE_COM_PLC_A = Decimal("0.35")
BASE_SEM_PLC_A = Decimal("0.10")

# Corrente média por ponto (A)
POR_ENTRADA_DIGITAL_A = Decimal("0.008")
POR_SAIDA_DIGITAL_A = Decimal("0.050")
POR_ENTRADA_ANALOGICA_A = Decimal("0.015")
POR_SAIDA_ANALOGICA_A = Decimal("0.040")

# Margem de projeto (ex.: 25%)
MARGEM_PERCENTUAL = Decimal("0.25")


def calcular_corrente_estimada_fonte_24vcc_a(projeto, totais_io: dict[str, int]) -> Decimal:
    if not calcular_necessita_fonte_24vcc(projeto):
        return Decimal("0.00")

    base = BASE_COM_PLC_A if projeto.possui_plc else BASE_SEM_PLC_A
    soma = base
    soma += Decimal(totais_io["total_entradas_digitais"]) * POR_ENTRADA_DIGITAL_A
    soma += Decimal(totais_io["total_saidas_digitais"]) * POR_SAIDA_DIGITAL_A
    soma += Decimal(totais_io["total_entradas_analogicas"]) * POR_ENTRADA_ANALOGICA_A
    soma += Decimal(totais_io["total_saidas_analogicas"]) * POR_SAIDA_ANALOGICA_A

    com_margem = soma * (Decimal("1.00") + MARGEM_PERCENTUAL)
    return com_margem.quantize(Decimal("0.01"))
