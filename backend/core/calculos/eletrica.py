from decimal import Decimal
from math import sqrt

from .gerais import arredondar_decimal

def calcular_corrente_trifasica(
    potencia_kw: Decimal,
    tensao_v: Decimal,
    fator_potencia: Decimal,
    rendimento: Decimal,
) -> Decimal:
    """
    I = P / (sqrt(3) * V * fp * rendimento)

    potência em kW
    tensão em V
    fp e rendimento em valores decimais (ex.: 0.92)
    """
    if tensao_v <= 0 or fator_potencia <= 0 or rendimento <= 0:
        return Decimal("0")

    potencia_w = potencia_kw * Decimal("1000")
    denominador = Decimal(str(sqrt(3))) * tensao_v * fator_potencia * rendimento

    if denominador == 0:
        return Decimal("0")

    corrente = potencia_w / denominador
    return arredondar_decimal(corrente, 2)


def calcular_corrente_monofasica(
    potencia_kw: Decimal,
    tensao_v: Decimal,
    fator_potencia: Decimal,
    rendimento: Decimal,
) -> Decimal:
    """
    I = P / (V * fp * rendimento)
    """
    if tensao_v <= 0 or fator_potencia <= 0 or rendimento <= 0:
        return Decimal("0")

    potencia_w = potencia_kw * Decimal("1000")
    denominador = tensao_v * fator_potencia * rendimento

    if denominador == 0:
        return Decimal("0")

    corrente = potencia_w / denominador
    return arredondar_decimal(corrente, 2)