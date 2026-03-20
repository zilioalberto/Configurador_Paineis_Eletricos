from decimal import Decimal, ROUND_HALF_UP
from math import sqrt


def arredondar_decimal(valor: Decimal, casas: int = 2) -> Decimal:
    quant = Decimal("1." + ("0" * casas))
    return valor.quantize(quant, rounding=ROUND_HALF_UP)
