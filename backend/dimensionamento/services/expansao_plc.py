from __future__ import annotations

# Capacidade típica de CPU compacta (ajustável conforme padrão interno)
LIMITE_ED_CPU = 16
LIMITE_SD_CPU = 16
LIMITE_EA_CPU = 4
LIMITE_SA_CPU = 4


def calcular_necessita_expansao_plc(projeto, totais_io: dict[str, int]) -> bool:
    if not projeto.possui_plc:
        return False
    return (
        totais_io["total_entradas_digitais"] > LIMITE_ED_CPU
        or totais_io["total_saidas_digitais"] > LIMITE_SD_CPU
        or totais_io["total_entradas_analogicas"] > LIMITE_EA_CPU
        or totais_io["total_saidas_analogicas"] > LIMITE_SA_CPU
    )
