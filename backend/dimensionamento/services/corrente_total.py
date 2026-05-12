from decimal import Decimal

from cargas.models import (
    CargaMotor,
    CargaResistencia,
    CargaSensor,
    CargaTransdutor,
    CargaValvula,
)
from dimensionamento.models import ResumoDimensionamento


MODELOS_COM_CORRENTE = [
    CargaMotor,
    CargaResistencia,
    CargaValvula,
    CargaSensor,
    CargaTransdutor,
]


def _corrente_por_especificacao(espec) -> Decimal | None:
    corrente_calc = getattr(espec, "corrente_calculada_a", None)
    if corrente_calc is not None:
        return Decimal(corrente_calc)

    corrente_ma = getattr(espec, "corrente_consumida_ma", None)
    if corrente_ma is not None:
        return Decimal(corrente_ma) / Decimal("1000")

    return None


def _numero_fases_especificacao(espec) -> int | None:
    numero_fases = getattr(espec, "numero_fases", None)
    if numero_fases is None:
        return None
    try:
        return int(numero_fases)
    except (TypeError, ValueError):
        return None


def calcular_corrente_total_painel(projeto) -> Decimal:
    """
    Soma a corrente calculada (por unidade) das cargas ativas, multiplicada
    pela quantidade de cada carga, aplicando o fator de demanda do projeto.
    """
    fases_projeto = int(getattr(projeto, "numero_fases", 1) or 1)
    fase_correntes = [Decimal("0.00") for _ in range(max(1, fases_projeto))]

    for model in MODELOS_COM_CORRENTE:
        especs = model.objects.filter(
            carga__projeto=projeto,
            carga__ativo=True,
        ).select_related("carga")

        for espec in especs:
            corrente = _corrente_por_especificacao(espec)
            if corrente is None:
                continue

            quantidade_raw = getattr(espec.carga, "quantidade", 1) or 1
            try:
                quantidade = max(1, int(quantidade_raw))
            except (TypeError, ValueError):
                quantidade = 1
            fases_carga = _numero_fases_especificacao(espec)
            fases_carga = min(
                fases_projeto,
                max(1, int(fases_carga) if fases_carga is not None else 1),
            )

            # Distribui cada unidade da carga nas fases menos carregadas.
            # Assim o resumo considera a fase potencialmente mais sobrecarregada.
            for _ in range(quantidade):
                fases_ordenadas = sorted(
                    range(fases_projeto), key=lambda idx: fase_correntes[idx]
                )
                for fase_idx in fases_ordenadas[:fases_carga]:
                    fase_correntes[fase_idx] += corrente

    corrente_total = max(fase_correntes) if fase_correntes else Decimal("0.00")

    fd = projeto.fator_demanda
    if fd is None:
        fd = Decimal("1.00")
    return (corrente_total * fd).quantize(Decimal("0.01"))


def calcular_e_salvar_corrente_total_painel(projeto) -> ResumoDimensionamento:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    resumo.corrente_total_painel_a = calcular_corrente_total_painel(projeto)
    resumo.save()
    return resumo