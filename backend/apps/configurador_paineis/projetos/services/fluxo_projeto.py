from django.core.exceptions import ValidationError
from django.db import transaction

from apps.configurador_paineis.projetos.models import ProjetoConfigurador
from apps.configurador_paineis.composicao_painel.models import SugestaoItem, PendenciaItem, ComposicaoItem
from core.choices import (
    StatusProjetoChoices,
    StatusSugestaoChoices,
    StatusPendenciaChoices,
)

MSG_PROJETO_NAO_INFORMADO = "Projeto não informado."


def validar_projeto_editavel(projeto: ProjetoConfigurador) -> None:
    if projeto is None:
        raise ValidationError(MSG_PROJETO_NAO_INFORMADO)

    if projeto.status == StatusProjetoChoices.FINALIZADO:
        raise ValidationError(
            "O projeto está finalizado e não permite alterações."
        )


def validar_projeto_pode_ser_finalizado(projeto: ProjetoConfigurador) -> None:
    if projeto is None:
        raise ValidationError(MSG_PROJETO_NAO_INFORMADO)

    if projeto.status == StatusProjetoChoices.FINALIZADO:
        raise ValidationError("O projeto já está finalizado.")

    possui_itens_composicao = ComposicaoItem.objects.filter(
        projeto=projeto
    ).exists()
    if not possui_itens_composicao:
        raise ValidationError(
            "Não é possível finalizar o projeto sem itens na composição."
        )

    possui_sugestoes_pendentes = SugestaoItem.objects.filter(
        projeto=projeto,
        status=StatusSugestaoChoices.PENDENTE,
    ).exists()
    if possui_sugestoes_pendentes:
        raise ValidationError(
            "Não é possível finalizar o projeto: existem sugestões pendentes."
        )

    possui_pendencias_abertas = PendenciaItem.objects.filter(
        projeto=projeto,
        status=StatusPendenciaChoices.ABERTA,
    ).exists()
    if possui_pendencias_abertas:
        raise ValidationError(
            "Não é possível finalizar o projeto: existem pendências abertas."
        )


@transaction.atomic
def finalizar_projeto(projeto: ProjetoConfigurador) -> ProjetoConfigurador:
    validar_projeto_pode_ser_finalizado(projeto)

    projeto.status = StatusProjetoChoices.FINALIZADO
    projeto.save(update_fields=["status"])

    return projeto


def validar_projeto_pode_ser_reaberto(projeto: ProjetoConfigurador) -> None:
    if projeto is None:
        raise ValidationError(MSG_PROJETO_NAO_INFORMADO)

    if projeto.status != StatusProjetoChoices.FINALIZADO:
        raise ValidationError(
            "Somente projetos finalizados podem ser reabertos."
        )


@transaction.atomic
def reabrir_projeto(projeto: ProjetoConfigurador) -> ProjetoConfigurador:
    validar_projeto_pode_ser_reaberto(projeto)

    projeto.status = StatusProjetoChoices.EM_ANDAMENTO
    projeto.save(update_fields=["status"])

    return projeto