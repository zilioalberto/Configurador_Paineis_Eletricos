from __future__ import annotations

from cargas.models import Carga


def calcular_totais_io_plc(projeto) -> dict[str, int]:
    """
    Soma pontos de I/O declarados nas cargas ativas (quantidade × ocorrência).
    """
    tot_ed = tot_sd = tot_ea = tot_sa = 0
    for c in Carga.objects.filter(projeto=projeto, ativo=True):
        q = c.quantidade
        if c.ocupa_entrada_digital:
            tot_ed += q
        if c.ocupa_saida_digital:
            tot_sd += q
        if c.ocupa_entrada_analogica:
            tot_ea += q
        if c.ocupa_saida_analogica:
            tot_sa += q
    return {
        "total_entradas_digitais": tot_ed,
        "total_saidas_digitais": tot_sd,
        "total_entradas_analogicas": tot_ea,
        "total_saidas_analogicas": tot_sa,
    }
