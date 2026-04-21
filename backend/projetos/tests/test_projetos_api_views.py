from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from core.choices import StatusProjetoChoices, TensaoChoices
from core.choices.usuarios import TipoUsuarioChoices
from projetos.models import ProjetoEvento

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
    raw = "projetos-api-secret-12345"
    user = User.objects.create_user(
        email="projetos-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
        first_name="Admin",
        last_name="Projetos",
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
def test_dashboard_resumo_e_alocar_codigo(admin_client, criar_projeto):
    client, _ = admin_client
    criar_projeto(nome="P1", codigo="21001-26", tensao_nominal=TensaoChoices.V380)

    r1 = client.get(reverse("dashboard-resumo"))
    assert r1.status_code == 200
    assert "projetos" in r1.data and "cargas" in r1.data

    r2 = client.post(reverse("projetos-alocar-codigo"), {}, format="json")
    assert r2.status_code == 200
    assert "codigo" in r2.data


@pytest.mark.django_db
def test_responsaveis_options_admin_lista_ativos(admin_client):
    client, _ = admin_client
    other = User.objects.create_user(
        email="resp-proj@test.com",
        password="xpto-12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
        first_name="Resp",
        last_name="One",
    )
    response = client.get(reverse("projetos-responsaveis"))
    assert response.status_code == 200
    ids = {str(item["id"]) for item in response.data}
    assert str(other.id) in ids


@pytest.mark.django_db
@patch("projetos.api.views.reiniciar_dependentes_apos_alteracao_tensao_nominal")
def test_update_projeto_com_tensao_alterada_reinicia_dependentes(
    mock_reiniciar, admin_client, criar_projeto
):
    client, _ = admin_client
    projeto = criar_projeto(nome="P2", codigo="21002-26", tensao_nominal=TensaoChoices.V380)
    url = reverse("projetos-detail", kwargs={"pk": projeto.id})
    payload = {
        "nome": projeto.nome,
        "codigo": projeto.codigo,
        "status": projeto.status,
        "tipo_painel": projeto.tipo_painel,
        "tipo_corrente": projeto.tipo_corrente,
        "tensao_nominal": TensaoChoices.V220,
        "numero_fases": projeto.numero_fases,
        "frequencia": projeto.frequencia,
        "possui_neutro": projeto.possui_neutro,
        "possui_terra": projeto.possui_terra,
        "tipo_conexao_alimentacao_potencia": projeto.tipo_conexao_alimentacao_potencia,
        "tipo_conexao_alimentacao_neutro": projeto.tipo_conexao_alimentacao_neutro,
        "tipo_conexao_alimentacao_terra": projeto.tipo_conexao_alimentacao_terra,
        "tipo_corrente_comando": projeto.tipo_corrente_comando,
        "tensao_comando": projeto.tensao_comando,
    }
    response = client.patch(url, payload, format="json")
    assert response.status_code == 200
    mock_reiniciar.assert_called_once()


@pytest.mark.django_db
def test_historico_projeto_retorna_eventos(admin_client, criar_projeto):
    client, user = admin_client
    projeto = criar_projeto(
        nome="P3",
        codigo="21003-26",
        tensao_nominal=TensaoChoices.V380,
        status=StatusProjetoChoices.EM_ANDAMENTO,
    )
    ProjetoEvento.objects.create(
        projeto=projeto,
        usuario=user,
        modulo="projeto",
        acao="teste",
        descricao="Evento teste",
        detalhes={},
    )
    url = reverse("projetos-historico", kwargs={"pk": projeto.id})
    response = client.get(url)
    assert response.status_code == 200
    assert len(response.data) >= 1
    assert response.data[0]["descricao"] == "Evento teste"
