"""Cálculo da corrente total do painel a partir das cargas ativas."""

from decimal import Decimal

from apps.configurador_paineis.cargas.models import (
    CargaMotor,
    CargaResistencia,
    CargaSensor,
    CargaTransdutor,
    CargaValvula,
)
from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento
from core.choices import TipoPainelChoices


MODELOS_COM_CORRENTE = [
    CargaMotor,
    CargaResistencia,
    CargaValvula,
    CargaSensor,
    CargaTransdutor,
]


def painel_aplica_fator_demanda(projeto) -> bool:
    """Fator de demanda só entra no seccionamento de entrada (painel distribuição)."""
    return getattr(projeto, "tipo_painel", None) == TipoPainelChoices.DISTRIBUICAO


def fator_demanda_efetivo(projeto) -> Decimal:
    if not painel_aplica_fator_demanda(projeto):
        return Decimal("1.00")

    fd = getattr(projeto, "fator_demanda", None)
    if fd is None:
        return Decimal("1.00")
    return Decimal(fd)


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


def _quantidade_carga(espec) -> int:
    quantidade_raw = getattr(espec.carga, "quantidade", 1) or 1
    try:
        return max(1, int(quantidade_raw))
    except (TypeError, ValueError):
        return 1


def _distribuir_corrente_carga(
    fase_correntes: list[Decimal],
    corrente: Decimal,
    quantidade: int,
    fases_carga: int,
) -> None:
    """
    Para cada unidade da carga, soma a corrente nas fases menos carregadas.

    Monofásica: 1 fase; trifásica: 3 fases; bifásica: 2 fases (quando informado).
    A corrente por unidade já é a de linha/fase (ver core/calculos/eletrica.py).
    """
    fases_projeto = len(fase_correntes)
    for _ in range(quantidade):
        fases_ordenadas = sorted(
            range(fases_projeto), key=lambda idx: fase_correntes[idx]
        )
        for fase_idx in fases_ordenadas[:fases_carga]:
            fase_correntes[fase_idx] += corrente


def _acumular_correntes_por_fase(projeto, fase_correntes: list[Decimal]) -> None:
    fases_projeto = len(fase_correntes)

    for model in MODELOS_COM_CORRENTE:
        especs = model.objects.filter(
            carga__projeto=projeto,
            carga__ativo=True,
        ).select_related("carga")

        for espec in especs:
            corrente = _corrente_por_especificacao(espec)
            if corrente is None:
                continue

            fases_carga = _numero_fases_especificacao(espec)
            fases_carga = min(
                fases_projeto,
                max(1, int(fases_carga) if fases_carga is not None else 1),
            )
            _distribuir_corrente_carga(
                fase_correntes,
                corrente,
                _quantidade_carga(espec),
                fases_carga,
            )


def calcular_correntes_por_fase_painel(projeto) -> list[Decimal]:
    """
    Acumula a corrente das cargas ativas em cada fase do painel (sem fator de demanda).

    Regras de distribuição por unidade de carga:
    - Monofásica (1 fase): aloca na fase menos carregada (balanceamento).
    - Trifásica (3 fases): soma I em todas as fases do painel (corrente de linha).
    - Bifásica (2 fases): soma I nas duas fases menos carregadas.
    - Sem ``numero_fases`` (válvulas, sensores, transdutores): trata como monofásica.

    Se a carga tiver mais fases que o painel, limita às fases disponíveis no projeto.
    """
    fases_projeto = int(getattr(projeto, "numero_fases", 1) or 1)
    fase_correntes = [Decimal("0.00") for _ in range(max(1, fases_projeto))]
    _acumular_correntes_por_fase(projeto, fase_correntes)
    return fase_correntes


def calcular_corrente_total_painel(projeto) -> Decimal:
    """
    Corrente de referência do painel para alimentação geral e seccionamento.

    Usa a fase mais carregada após distribuir as cargas ativas (ver
    ``calcular_correntes_por_fase_painel``). O fator de demanda do projeto só
    é aplicado em painéis do tipo distribuição.
    """
    return calcular_corrente_referencia_entrada_painel(projeto).corrente_referencia_a


def calcular_corrente_referencia_entrada_painel(projeto):
    """
    Corrente de entrada do painel para disjuntor geral / seccionamento.

    Retorna um namespace simples com:
    - correntes_por_fase_a: distribuição por fase (sem fator de demanda)
    - indice_fase_mais_carregada: índice 0-based da fase de maior corrente
    - corrente_fase_mais_carregada_a: valor dessa fase (sem fator de demanda)
    - fator_demanda: multiplicador aplicado (1.00 em automação)
    - corrente_referencia_a: corrente_fase_mais_carregada × fator_demanda
    """
    from types import SimpleNamespace

    fase_correntes = calcular_correntes_por_fase_painel(projeto)
    if not fase_correntes:
        fd = fator_demanda_efetivo(projeto)
        return SimpleNamespace(
            correntes_por_fase_a=[],
            indice_fase_mais_carregada=None,
            corrente_fase_mais_carregada_a=Decimal("0.00"),
            fator_demanda=fd,
            corrente_referencia_a=Decimal("0.00"),
        )

    indice_max = max(range(len(fase_correntes)), key=lambda idx: fase_correntes[idx])
    corrente_fase_max = fase_correntes[indice_max]
    fd = fator_demanda_efetivo(projeto)
    corrente_ref = (corrente_fase_max * fd).quantize(Decimal("0.01"))

    return SimpleNamespace(
        correntes_por_fase_a=fase_correntes,
        indice_fase_mais_carregada=indice_max,
        corrente_fase_mais_carregada_a=corrente_fase_max,
        fator_demanda=fd,
        corrente_referencia_a=corrente_ref,
    )


def calcular_e_salvar_corrente_total_painel(projeto) -> ResumoDimensionamento:
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    resumo.corrente_total_painel_a = calcular_corrente_total_painel(projeto)
    resumo.save()
    return resumo
