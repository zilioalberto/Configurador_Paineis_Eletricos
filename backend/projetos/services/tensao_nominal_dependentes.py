"""Efeitos em cascata quando a tensão nominal do projeto é alterada."""

from __future__ import annotations

from decimal import ROUND_HALF_UP, Decimal

from django.db import transaction
from django.utils import timezone

from cargas.models import Carga, CargaMotor
from composicao_painel.models import ComposicaoItem, PendenciaItem, SugestaoItem
from core.choices import UnidadePotenciaCorrenteChoices
from dimensionamento.services import calcular_e_salvar_dimensionamento_basico
from projetos.models import Projeto


def _escalar_entrada_ampere_motores(
    motores, tensao_nominal_anterior: int | None, tensao_nominal_nova: int
) -> None:
    """
    Quando o valor foi informado em ampere, trata-o como corrente na tensão anterior
    e reprojeta na tensão nova (potência aproximadamente constante: I ∝ V_antiga / V_nova).
    """
    if tensao_nominal_anterior is None or tensao_nominal_anterior == tensao_nominal_nova:
        return
    if not tensao_nominal_nova:
        return
    ratio = Decimal(tensao_nominal_anterior) / Decimal(tensao_nominal_nova)
    for motor in motores:
        if motor.potencia_corrente_unidade != UnidadePotenciaCorrenteChoices.A:
            continue
        motor.potencia_corrente_valor = (
            motor.potencia_corrente_valor * ratio
        ).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@transaction.atomic
def reiniciar_dependentes_apos_alteracao_tensao_nominal(
    projeto: Projeto,
    *,
    tensao_nominal_anterior: int | None = None,
) -> None:
    """
    Após mudança de tensão nominal:
    - remove sugestões, pendências e itens aprovados da composição (reinício do fluxo);
    - reprojeta entradas em ampere dos motores para a nova tensão (quando aplicável);
    - recalcula correntes das cargas motor (derivadas da tensão do projeto);
    - atualiza carimbo temporal das cargas e persiste novo resumo de dimensionamento.
    """
    SugestaoItem.objects.filter(projeto=projeto).delete()
    PendenciaItem.objects.filter(projeto=projeto).delete()
    ComposicaoItem.objects.filter(projeto=projeto).delete()

    motores = list(
        CargaMotor.objects.filter(carga__projeto=projeto).select_related("carga")
    )
    _escalar_entrada_ampere_motores(
        motores,
        tensao_nominal_anterior=tensao_nominal_anterior,
        tensao_nominal_nova=projeto.tensao_nominal,
    )
    for motor in motores:
        motor.save()

    Carga.objects.filter(projeto=projeto).update(atualizado_em=timezone.now())

    calcular_e_salvar_dimensionamento_basico(projeto)
