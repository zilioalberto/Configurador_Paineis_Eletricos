from dimensionamento.models import ResumoDimensionamento
from core.choices import TipoCorrenteChoices


def calcular_necessita_fonte_24vcc(projeto) -> bool:
    """
    Retorna True quando o comando do projeto for 24 Vcc
    e a alimentação principal do projeto não for em corrente contínua.
    """
    return (
        projeto.tensao_comando == 24
        and projeto.tipo_corrente_comando == TipoCorrenteChoices.CC
        and projeto.tipo_corrente != TipoCorrenteChoices.CC
    )


def calcular_e_salvar_necessita_fonte_24vcc(projeto) -> ResumoDimensionamento:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    resumo.necessita_fonte_24vcc = calcular_necessita_fonte_24vcc(projeto)
    resumo.save()
    return resumo