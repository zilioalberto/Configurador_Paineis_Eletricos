from unittest.mock import Mock, patch

import pytest
from django.core.exceptions import ValidationError

from apps.configurador_paineis.projetos.services.fluxo_projeto import (
    finalizar_projeto,
    reabrir_projeto,
    validar_projeto_editavel,
    validar_projeto_pode_ser_finalizado,
    validar_projeto_pode_ser_reaberto,
)
from core.choices import StatusProjetoChoices


class ProjetoStub:
    def __init__(self, status):
        self.status = status
        self.save = Mock()


def _queryset_exists(value: bool):
    qs = Mock()
    qs.exists.return_value = value
    return qs


@pytest.mark.parametrize(
    ("projeto", "mensagem"),
    [
        (None, "Projeto não informado."),
        (
            ProjetoStub(StatusProjetoChoices.FINALIZADO),
            "O projeto está finalizado e não permite alterações.",
        ),
    ],
)
def test_validar_projeto_editavel_rejeita_casos_bloqueados(projeto, mensagem):
    with pytest.raises(ValidationError, match=mensagem):
        validar_projeto_editavel(projeto)


def test_validar_projeto_editavel_aceita_projeto_em_andamento():
    validar_projeto_editavel(ProjetoStub(StatusProjetoChoices.EM_ANDAMENTO))


@pytest.mark.parametrize(
    ("projeto", "mensagem"),
    [
        (None, "Projeto não informado."),
        (ProjetoStub(StatusProjetoChoices.FINALIZADO), "O projeto já está finalizado."),
    ],
)
def test_validar_projeto_pode_ser_finalizado_rejeita_estado_inicial_invalido(
    projeto, mensagem
):
    with pytest.raises(ValidationError, match=mensagem):
        validar_projeto_pode_ser_finalizado(projeto)


def test_validar_projeto_pode_ser_finalizado_exige_itens_composicao():
    projeto = ProjetoStub(StatusProjetoChoices.EM_ANDAMENTO)

    with patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.ComposicaoItem.objects.filter",
        return_value=_queryset_exists(False),
    ):
        with pytest.raises(ValidationError, match="sem itens na composição"):
            validar_projeto_pode_ser_finalizado(projeto)


def test_validar_projeto_pode_ser_finalizado_bloqueia_sugestoes_pendentes():
    projeto = ProjetoStub(StatusProjetoChoices.EM_ANDAMENTO)

    with patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.ComposicaoItem.objects.filter",
        return_value=_queryset_exists(True),
    ), patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.SugestaoItem.objects.filter",
        return_value=_queryset_exists(True),
    ):
        with pytest.raises(ValidationError, match="sugestões pendentes"):
            validar_projeto_pode_ser_finalizado(projeto)


def test_validar_projeto_pode_ser_finalizado_bloqueia_pendencias_abertas():
    projeto = ProjetoStub(StatusProjetoChoices.EM_ANDAMENTO)

    with patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.ComposicaoItem.objects.filter",
        return_value=_queryset_exists(True),
    ), patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.SugestaoItem.objects.filter",
        return_value=_queryset_exists(False),
    ), patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.PendenciaItem.objects.filter",
        return_value=_queryset_exists(True),
    ):
        with pytest.raises(ValidationError, match="pendências abertas"):
            validar_projeto_pode_ser_finalizado(projeto)


@pytest.mark.django_db
def test_finalizar_projeto_altera_status_e_salva():
    projeto = ProjetoStub(StatusProjetoChoices.EM_ANDAMENTO)

    with patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.ComposicaoItem.objects.filter",
        return_value=_queryset_exists(True),
    ), patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.SugestaoItem.objects.filter",
        return_value=_queryset_exists(False),
    ), patch(
        "apps.configurador_paineis.projetos.services.fluxo_projeto.PendenciaItem.objects.filter",
        return_value=_queryset_exists(False),
    ):
        assert finalizar_projeto(projeto) is projeto

    assert projeto.status == StatusProjetoChoices.FINALIZADO
    projeto.save.assert_called_once_with(update_fields=["status"])


@pytest.mark.parametrize(
    ("projeto", "mensagem"),
    [
        (None, "Projeto não informado."),
        (
            ProjetoStub(StatusProjetoChoices.EM_ANDAMENTO),
            "Somente projetos finalizados podem ser reabertos.",
        ),
    ],
)
def test_validar_projeto_pode_ser_reaberto_rejeita_casos_invalidos(projeto, mensagem):
    with pytest.raises(ValidationError, match=mensagem):
        validar_projeto_pode_ser_reaberto(projeto)


@pytest.mark.django_db
def test_reabrir_projeto_altera_status_e_salva():
    projeto = ProjetoStub(StatusProjetoChoices.FINALIZADO)

    assert reabrir_projeto(projeto) is projeto

    assert projeto.status == StatusProjetoChoices.EM_ANDAMENTO
    projeto.save.assert_called_once_with(update_fields=["status"])
