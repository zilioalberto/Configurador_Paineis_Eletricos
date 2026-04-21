from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from core.choices import TensaoChoices
from core.choices.usuarios import TipoUsuarioChoices
from dimensionamento.models import ResumoDimensionamento

User = get_user_model()


def _auth_client(email: str, password: str) -> APIClient:
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": email, "password": password},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.fixture
def admin_client():
    raw = "dimensionamento-api-secret-12345"
    user = User.objects.create_user(
        email="dimensionamento-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
@patch("dimensionamento.api.views.calcular_e_salvar_dimensionamento_basico")
def test_get_dimensionamento_cria_e_calcula_primeira_vez(mock_calc, admin_client, criar_projeto):
    client, _ = admin_client
    projeto = criar_projeto(nome="Dim", codigo="20001-26", tensao_nominal=TensaoChoices.V380)
    resumo = ResumoDimensionamento.objects.create(projeto=projeto, corrente_total_painel_a=0)
    mock_calc.return_value = resumo

    ResumoDimensionamento.objects.filter(pk=resumo.pk).delete()
    url = reverse("dimensionamento-por-projeto", kwargs={"projeto_id": projeto.id})
    response = client.get(url)

    assert response.status_code == 200
    assert "corrente_total_painel_a" in response.data
    mock_calc.assert_called_once_with(projeto)


@pytest.mark.django_db
@patch("dimensionamento.api.views.registrar_evento_projeto")
@patch("dimensionamento.api.views.calcular_e_salvar_dimensionamento_basico")
def test_post_recalcular_dimensionamento_registra_evento(
    mock_calc, mock_evento, admin_client, criar_projeto
):
    client, user = admin_client
    projeto = criar_projeto(nome="Dim2", codigo="20002-26", tensao_nominal=TensaoChoices.V380)
    resumo = ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=12.5,
    )
    mock_calc.return_value = resumo
    url = reverse("dimensionamento-recalcular", kwargs={"projeto_id": projeto.id})

    response = client.post(url, {}, format="json")

    assert response.status_code == 200
    assert str(response.data["projeto"]) == str(projeto.id)
    mock_calc.assert_called_once_with(projeto)
    mock_evento.assert_called_once()
    kwargs = mock_evento.call_args.kwargs
    assert kwargs["projeto"] == projeto
    assert kwargs["usuario"] == user
