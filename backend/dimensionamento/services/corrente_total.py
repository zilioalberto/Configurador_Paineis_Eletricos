from decimal import Decimal

from cargas.models import CargaMotor
from dimensionamento.models import ResumoDimensionamento


MODELOS_COM_CORRENTE = [
    CargaMotor,
]


def calcular_corrente_total_painel(projeto) -> Decimal:
    """
    Soma a corrente calculada de todas as cargas ativas do projeto
    que possuam o atributo corrente_calculada_a.
    """
    corrente_total = Decimal("0.00")

    for model in MODELOS_COM_CORRENTE:
        cargas = model.objects.filter(
            carga__projeto=projeto,
            carga__ativo=True,
        )

        for carga in cargas:
            corrente = getattr(carga, "corrente_calculada_a", None)
            if corrente is not None:
                corrente_total += corrente

    return corrente_total


def calcular_e_salvar_corrente_total_painel(projeto) -> ResumoDimensionamento:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    resumo.corrente_total_painel_a = calcular_corrente_total_painel(projeto)
    resumo.save()
    return resumo