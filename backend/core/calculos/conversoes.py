from decimal import Decimal

FATOR_CV_PARA_KW = Decimal("0.7355")


def normalizar_para_kw(valor: Decimal, unidade: str) -> Decimal | None:
    if valor is None or unidade is None:
        return None

    if unidade == "KW":
        return valor

    if unidade == "CV":
        return valor * FATOR_CV_PARA_KW

    # Se for corrente, não faz sentido converter
    return None


