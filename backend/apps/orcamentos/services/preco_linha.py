from decimal import Decimal


def calcular_preco_unitario_linha(
    custo,
    margem,
    aliquota_ipi=None,
) -> Decimal:
    """Preço = custo + valor da margem + valor do IPI (ambos sobre o custo)."""
    custo_d = Decimal(str(custo or 0))
    margem_d = Decimal(str(margem or 0))
    ipi_d = Decimal(str(aliquota_ipi or 0))
    return custo_d + custo_d * margem_d / Decimal("100") + custo_d * ipi_d / Decimal("100")
