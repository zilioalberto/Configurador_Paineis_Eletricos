"""Indica se o projeto exige PLC com base no flag `possui_plc`."""

from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento


def calcular_necessita_plc(projeto) -> bool:
    """
    Retorna True quando o projeto indicar necessidade de PLC.
    """
    return bool(projeto.possui_plc)


def calcular_e_salvar_necessita_plc(projeto) -> ResumoDimensionamento:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    resumo.necessita_plc = calcular_necessita_plc(projeto)
    resumo.save()
    return resumo