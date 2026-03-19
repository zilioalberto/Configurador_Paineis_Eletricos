from decimal import Decimal


def to_decimal(valor):
    if valor is None:
        return Decimal("0")
    return Decimal(str(valor))