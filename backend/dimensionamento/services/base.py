from dimensionamento.models import ResumoDimensionamento

from .circuitos import calcular_e_salvar_circuitos_cargas
from .automacao import calcular_necessita_plc
from .comando import calcular_necessita_fonte_24vcc
from .corrente_total import calcular_corrente_total_painel
from .expansao_plc import calcular_necessita_expansao_plc
from .fonte_24v import calcular_corrente_estimada_fonte_24vcc_a
from .io_plc import calcular_totais_io_plc


def calcular_e_salvar_dimensionamento_basico(projeto) -> ResumoDimensionamento:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)

    totais_io = calcular_totais_io_plc(projeto)

    resumo.corrente_total_painel_a = calcular_corrente_total_painel(projeto)
    resumo.necessita_fonte_24vcc = calcular_necessita_fonte_24vcc(projeto)
    resumo.necessita_plc = calcular_necessita_plc(projeto)
    resumo.necessita_expansao_plc = calcular_necessita_expansao_plc(projeto, totais_io)

    resumo.total_entradas_digitais = totais_io["total_entradas_digitais"]
    resumo.total_saidas_digitais = totais_io["total_saidas_digitais"]
    resumo.total_entradas_analogicas = totais_io["total_entradas_analogicas"]
    resumo.total_saidas_analogicas = totais_io["total_saidas_analogicas"]

    resumo.corrente_estimada_fonte_24vcc_a = calcular_corrente_estimada_fonte_24vcc_a(
        projeto, totais_io
    )

    resumo.save()

    calcular_e_salvar_circuitos_cargas(projeto, resumo)

    resumo.refresh_from_db(fields=["condutores_revisao_confirmada", "atualizado_em"])

    return resumo