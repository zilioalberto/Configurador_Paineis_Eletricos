from decimal import Decimal

from cargas.models import CargaMotor
from dimensionamento.models import ResumoDimensionamento


MODELOS_COM_CORRENTE = [
    CargaMotor,
]


def calcular_corrente_total_painel(projeto) -> Decimal:
    """
    Soma a corrente calculada (por unidade) das cargas ativas, multiplicada
    pela quantidade de cada carga, aplicando o fator de demanda do projeto.
    """
    corrente_total = Decimal("0.00")

    for model in MODELOS_COM_CORRENTE:
        especs = model.objects.filter(
            carga__projeto=projeto,
            carga__ativo=True,
        ).select_related("carga")

        for espec in especs:
            corrente = getattr(espec, "corrente_calculada_a", None)
            if corrente is not None:
                q = espec.carga.quantidade
                corrente_total += corrente * q

    fd = projeto.fator_demanda
    if fd is None:
        fd = Decimal("1.00")
    return (corrente_total * fd).quantize(Decimal("0.01"))


def calcular_e_salvar_corrente_total_painel(projeto) -> ResumoDimensionamento:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    resumo.corrente_total_painel_a = calcular_corrente_total_painel(projeto)
    resumo.save()
    return resumo