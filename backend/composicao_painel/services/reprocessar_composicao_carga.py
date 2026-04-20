"""Recalculo da composição do painel quando uma carga é criada ou alterada."""

from __future__ import annotations

from django.core.exceptions import ValidationError
from django.db import transaction

from cargas.models import Carga
from composicao_painel.models import ComposicaoItem, PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.contatoras import (
    reprocessar_contatora_para_carga,
)
from composicao_painel.services.sugestoes.disjuntores_motor import (
    reprocessar_disjuntor_motor_para_carga,
)
from dimensionamento.services import calcular_e_salvar_dimensionamento_basico
from projetos.models import Projeto


@transaction.atomic
def reprocessar_composicao_painel_para_carga(projeto: Projeto, carga: Carga) -> None:
    """
    Qualquer alteração relevante à carga exige nova seleção de componentes:
    remove itens aprovados desta carga e todo o fluxo de sugestões/pendências
    associadas a ela; em seguida regera disjuntor motor e contatora conforme as regras atuais.
    """
    if projeto.pk != carga.projeto_id:
        projeto = Projeto.objects.get(pk=carga.projeto_id)

    ComposicaoItem.objects.filter(projeto=projeto, carga=carga).delete()

    SugestaoItem.objects.filter(projeto=projeto, carga=carga).delete()
    PendenciaItem.objects.filter(projeto=projeto, carga=carga).delete()

    reprocessar_disjuntor_motor_para_carga(projeto, carga)

    try:
        reprocessar_contatora_para_carga(projeto, carga)
    except ValidationError:
        pass

    calcular_e_salvar_dimensionamento_basico(projeto)
