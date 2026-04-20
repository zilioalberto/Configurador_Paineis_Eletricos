import secrets

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from core.choices import DEFAULT_PERMISSIONS_BY_TIPO, TipoUsuarioChoices

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
