from dimensionamento.models import ResumoDimensionamento

from .corrente_total import calcular_corrente_total_painel
from .comando import calcular_necessita_fonte_24vcc
from .automacao import calcular_necessita_plc


def calcular_e_salvar_dimensionamento_basico(projeto) -> ResumoDimensionamento:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)

    resumo.corrente_total_painel_a = calcular_corrente_total_painel(projeto)
    resumo.necessita_fonte_24vcc = calcular_necessita_fonte_24vcc(projeto)
    resumo.necessita_plc = calcular_necessita_plc(projeto)

    resumo.save()
    return resumo