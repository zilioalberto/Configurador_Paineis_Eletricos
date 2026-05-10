import secrets

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.rh.models import Cargo, Colaborador, Departamento, Equipe, JornadaTrabalho
from core.choices.usuarios import TipoUsuarioChoices
from core.permissions import PermissionKeys

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
    raw = secrets.token_urlsafe(24)
    user = User.objects.create_user(
        email="rh-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    return _auth_client(user.email, raw), user


@pytest.fixture
def usuario_client():
    raw = secrets.token_urlsafe(24)
    user = User.objects.create_user(
        email="rh-user@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
        permissoes_extras=[PermissionKeys.RH_VISUALIZAR],
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
class TestRhApi:
    def test_cria_base_rh_e_colaborador(self, admin_client):
        client, _ = admin_client

        departamento_resp = client.post(
            reverse("rh-departamentos-list"),
            {"nome": "Engenharia", "codigo": "ENG"},
            format="json",
        )
        cargo_resp = client.post(
            reverse("rh-cargos-list"),
            {"nome": "Projetista"},
            format="json",
        )
        jornada_resp = client.post(
            reverse("rh-jornadas-list"),
            {
                "nome": "Comercial",
                "carga_horaria_semanal": "44.00",
                "hora_inicio": "08:00:00",
                "hora_fim": "17:48:00",
                "dias_semana": [0, 1, 2, 3, 4],
            },
            format="json",
        )

        assert departamento_resp.status_code == 201
        assert cargo_resp.status_code == 201
        assert jornada_resp.status_code == 201

        equipe_resp = client.post(
            reverse("rh-equipes-list"),
            {
                "nome": "Projetos",
                "departamento": departamento_resp.data["id"],
            },
            format="json",
        )
        assert equipe_resp.status_code == 201

        colaborador_resp = client.post(
            reverse("rh-colaboradores-list"),
            {
                "matricula": "COL-001",
                "nome": "Ana Souza",
                "email": "ana@example.com",
                "cargo": cargo_resp.data["id"],
                "departamento": departamento_resp.data["id"],
                "equipe": equipe_resp.data["id"],
                "jornada": jornada_resp.data["id"],
                "data_admissao": "2026-05-01",
            },
            format="json",
        )

        assert colaborador_resp.status_code == 201, colaborador_resp.content
        colaborador = Colaborador.objects.get(matricula="COL-001")
        assert colaborador.cargo.nome == "Projetista"
        assert colaborador.departamento.nome == "Engenharia"
        assert colaborador.equipe.nome == "Projetos"
        assert colaborador.jornada.nome == "Comercial"

    def test_filtra_colaboradores_por_departamento(self, admin_client):
        client, _ = admin_client
        engenharia = Departamento.objects.create(nome="Engenharia", codigo="ENG")
        producao = Departamento.objects.create(nome="Produção", codigo="PROD")
        Colaborador.objects.create(
            matricula="001",
            nome="Colab Engenharia",
            departamento=engenharia,
        )
        Colaborador.objects.create(
            matricula="002",
            nome="Colab Produção",
            departamento=producao,
        )

        response = client.get(
            reverse("rh-colaboradores-list"),
            {"departamento": str(engenharia.id)},
        )

        assert response.status_code == 200
        payload = response.data["results"] if isinstance(response.data, dict) else response.data
        assert [item["nome"] for item in payload] == ["Colab Engenharia"]

    def test_rejeita_jornada_com_dia_invalido(self, admin_client):
        client, _ = admin_client

        response = client.post(
            reverse("rh-jornadas-list"),
            {"nome": "Inválida", "dias_semana": [0, 8]},
            format="json",
        )

        assert response.status_code == 400
        assert "dias" in str(response.data).lower()

    def test_rejeita_colaborador_com_equipe_de_outro_departamento(self, admin_client):
        client, _ = admin_client
        departamento_a = Departamento.objects.create(nome="Engenharia")
        departamento_b = Departamento.objects.create(nome="Produção")
        equipe = Equipe.objects.create(nome="Chão de fábrica", departamento=departamento_b)

        response = client.post(
            reverse("rh-colaboradores-list"),
            {
                "matricula": "COL-ERRO",
                "nome": "Incompatível",
                "departamento": str(departamento_a.id),
                "equipe": str(equipe.id),
            },
            format="json",
        )

        assert response.status_code == 400
        assert "equipe" in response.data

    def test_usuario_sem_edicao_visualiza_mas_nao_cria(self, usuario_client):
        client, _ = usuario_client
        Cargo.objects.create(nome="Auxiliar")

        listar = client.get(reverse("rh-cargos-list"))
        criar = client.post(reverse("rh-cargos-list"), {"nome": "Supervisor"}, format="json")

        assert listar.status_code == 200
        assert criar.status_code == 403

    def test_exclui_cadastro_sem_vinculo(self, admin_client):
        client, _ = admin_client
        cargo = Cargo.objects.create(nome="Temporário")

        response = client.delete(reverse("rh-cargos-detail", kwargs={"pk": cargo.pk}))

        assert response.status_code == 204
        assert not Cargo.objects.filter(pk=cargo.pk).exists()
