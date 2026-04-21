import secrets

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from core.choices import (
    DEFAULT_PERMISSIONS_BY_TIPO,
    FrequenciaChoices,
    NumeroFasesChoices,
    TipoConexaoAlimetacaoChoices,
    TipoUsuarioChoices,
)

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
def user_sem_permissoes():
    raw = secrets.token_urlsafe(32)
    defaults = list(DEFAULT_PERMISSIONS_BY_TIPO[TipoUsuarioChoices.USUARIO])
    user = User.objects.create_user(
        email="sem-permissoes@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
        permissoes_negadas=defaults,
    )
    return user, raw


@pytest.fixture
def user_basico():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_user(
        email="basico-permissoes@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
    )
    return user, raw


@pytest.mark.django_db
class TestFeaturePermissionsApi:
    def test_dashboard_requires_permission(self, user_sem_permissoes):
        user, secret = user_sem_permissoes
        client = _auth_client(user.email, secret)
        response = client.get(reverse("dashboard-resumo"))
        assert response.status_code == 403

    def test_projeto_list_requires_permission(self, user_sem_permissoes):
        user, secret = user_sem_permissoes
        client = _auth_client(user.email, secret)
        response = client.get(reverse("projetos-list"))
        assert response.status_code == 403

    def test_carga_list_requires_permission(self, user_sem_permissoes):
        user, secret = user_sem_permissoes
        client = _auth_client(user.email, secret)
        response = client.get(reverse("cargas-list"))
        assert response.status_code == 403

    def test_alocar_codigo_requires_create_permission(self, user_basico):
        user, secret = user_basico
        client = _auth_client(user.email, secret)
        response = client.post(reverse("projetos-alocar-codigo"), {}, format="json")
        assert response.status_code == 403

    def test_user_with_default_permission_can_open_lists(self, user_basico):
        user, secret = user_basico
        client = _auth_client(user.email, secret)
        projetos = client.get(reverse("projetos-list"))
        cargas = client.get(reverse("cargas-list"))
        dashboard = client.get(reverse("dashboard-resumo"))
        assert projetos.status_code == 200
        assert cargas.status_code == 200
        assert dashboard.status_code == 200


@pytest.mark.django_db
class TestProjetoVisibilityScopeApi:
    @staticmethod
    def _projeto_kwargs():
        return {
            "numero_fases": NumeroFasesChoices.TRIFASICO,
            "frequencia": FrequenciaChoices.HZ60,
            "tipo_conexao_alimentacao_neutro": TipoConexaoAlimetacaoChoices.BORNE,
            "tipo_conexao_alimentacao_terra": TipoConexaoAlimetacaoChoices.BORNE,
        }

    def test_orcamentista_lista_apenas_os_proprios_projetos(self):
        raw_1 = secrets.token_urlsafe(16)
        raw_2 = secrets.token_urlsafe(16)
        user_1 = User.objects.create_user(
            email="orc1@test.com",
            password=raw_1,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ORCAMENTISTA,
        )
        user_2 = User.objects.create_user(
            email="orc2@test.com",
            password=raw_2,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ORCAMENTISTA,
        )
        from projetos.models import Projeto

        p1 = Projeto.objects.create(
            nome="Projeto Orc 1",
            codigo="TST-ORC-001",
            criado_por=user_1,
            atualizado_por=user_1,
            **self._projeto_kwargs(),
        )
        Projeto.objects.create(
            nome="Projeto Orc 2",
            codigo="TST-ORC-002",
            criado_por=user_2,
            atualizado_por=user_2,
            **self._projeto_kwargs(),
        )

        client = _auth_client(user_1.email, raw_1)
        response = client.get(reverse("projetos-list"))
        assert response.status_code == 200
        payload = response.data["results"] if isinstance(response.data, dict) else response.data
        ids = {item["id"] for item in payload}
        assert str(p1.id) in ids
        assert len(ids) == 1

    def test_orcamentista_lista_projeto_atribuido_como_responsavel(self):
        raw_1 = secrets.token_urlsafe(16)
        raw_2 = secrets.token_urlsafe(16)
        user_1 = User.objects.create_user(
            email="orc6@test.com",
            password=raw_1,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ORCAMENTISTA,
        )
        user_2 = User.objects.create_user(
            email="orc7@test.com",
            password=raw_2,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ORCAMENTISTA,
        )
        from projetos.models import Projeto

        Projeto.objects.create(
            nome="Projeto atribuído",
            codigo="TST-ORC-005",
            criado_por=user_2,
            atualizado_por=user_2,
            responsavel=user_1,
            **self._projeto_kwargs(),
        )

        client = _auth_client(user_1.email, raw_1)
        response = client.get(reverse("projetos-list"))
        assert response.status_code == 200
        payload = response.data["results"] if isinstance(response.data, dict) else response.data
        assert len(payload) == 1
        assert payload[0]["codigo"] == "TST-ORC-005"

    def test_orcamentista_nao_acessa_projeto_de_outro_utilizador(self):
        raw_1 = secrets.token_urlsafe(16)
        raw_2 = secrets.token_urlsafe(16)
        user_1 = User.objects.create_user(
            email="orc3@test.com",
            password=raw_1,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ORCAMENTISTA,
        )
        user_2 = User.objects.create_user(
            email="orc4@test.com",
            password=raw_2,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ORCAMENTISTA,
        )
        from projetos.models import Projeto

        projeto_outro = Projeto.objects.create(
            nome="Projeto privado",
            codigo="TST-ORC-003",
            criado_por=user_2,
            atualizado_por=user_2,
            **self._projeto_kwargs(),
        )
        client = _auth_client(user_1.email, raw_1)
        response = client.get(reverse("projetos-detail", args=[projeto_outro.id]))
        assert response.status_code == 404

    def test_almoxarifado_visualiza_todos_os_projetos(self):
        raw_almox = secrets.token_urlsafe(16)
        raw_orc = secrets.token_urlsafe(16)
        almox = User.objects.create_user(
            email="almox@test.com",
            password=raw_almox,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ALMOXARIFADO,
        )
        orc = User.objects.create_user(
            email="orc5@test.com",
            password=raw_orc,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ORCAMENTISTA,
        )
        from projetos.models import Projeto

        p_almox = Projeto.objects.create(
            nome="Projeto Almox",
            codigo="TST-ALM-001",
            criado_por=almox,
            atualizado_por=almox,
            **self._projeto_kwargs(),
        )
        p_orc = Projeto.objects.create(
            nome="Projeto Orc",
            codigo="TST-ORC-004",
            criado_por=orc,
            atualizado_por=orc,
            **self._projeto_kwargs(),
        )

        client = _auth_client(almox.email, raw_almox)
        response = client.get(reverse("projetos-list"))
        assert response.status_code == 200
        payload = response.data["results"] if isinstance(response.data, dict) else response.data
        ids = {item["id"] for item in payload}
        assert str(p_almox.id) in ids
        assert str(p_orc.id) in ids
