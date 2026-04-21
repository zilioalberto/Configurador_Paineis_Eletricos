from __future__ import annotations

from cargas.models import Carga


def calcular_totais_io_plc(projeto) -> dict[str, int]:
    """
    Soma pontos de I/O declarados nas cargas ativas.
    """
    tot_ed = tot_sd = tot_ea = tot_sa = 0
    for c in Carga.objects.filter(projeto=projeto, ativo=True):
        tot_ed += c.quantidade_entradas_digitais or 0
        tot_sd += c.quantidade_saidas_digitais or 0
        tot_ea += c.quantidade_entradas_analogicas or 0
        tot_sa += c.quantidade_saidas_analogicas or 0
    return {
        "total_entradas_digitais": tot_ed,
        "total_saidas_digitais": tot_sd,
        "total_entradas_analogicas": tot_ea,
        "total_saidas_analogicas": tot_sa,
    }
