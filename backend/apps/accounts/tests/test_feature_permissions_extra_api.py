import secrets
from uuid import uuid4

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
        email="sem-permissoes-extra@test.com",
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
        email="basico-extra@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
    )
    return user, raw


@pytest.fixture
def user_almoxarifado():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_user(
        email="almoxarifado-extra@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ALMOXARIFADO,
    )
    return user, raw


@pytest.mark.django_db
class TestFeaturePermissionsExtraApi:
    def test_catalogo_list_forbidden_without_permission(self, user_sem_permissoes):
        user, secret = user_sem_permissoes
        client = _auth_client(user.email, secret)
        response = client.get(reverse("catalogo-produtos-list"))
        assert response.status_code == 403

    def test_catalogo_create_forbidden_without_edit_permission(self, user_basico):
        user, secret = user_basico
        client = _auth_client(user.email, secret)
        response = client.post(reverse("catalogo-produtos-list"), {}, format="json")
        assert response.status_code == 403

    def test_dimensionamento_get_forbidden_without_permission(self, user_sem_permissoes):
        user, secret = user_sem_permissoes
        client = _auth_client(user.email, secret)
        response = client.get(
            reverse("dimensionamento-por-projeto", kwargs={"projeto_id": uuid4()})
        )
        assert response.status_code == 403

    def test_dimensionamento_recalcular_forbidden_for_basic_user(self, user_basico):
        user, secret = user_basico
        client = _auth_client(user.email, secret)
        response = client.post(
            reverse("dimensionamento-recalcular", kwargs={"projeto_id": uuid4()}),
            {},
            format="json",
        )
        assert response.status_code == 403

    def test_composicao_snapshot_forbidden_for_basic_user(self, user_basico):
        user, secret = user_basico
        client = _auth_client(user.email, secret)
        response = client.get(
            reverse("composicao-projeto-snapshot", kwargs={"projeto_id": uuid4()})
        )
        assert response.status_code == 403

    def test_catalogo_and_dimensionamento_get_allowed_for_basic_user(self, user_basico):
        user, secret = user_basico
        client = _auth_client(user.email, secret)
        catalogo = client.get(reverse("catalogo-produtos-list"))
        dimensionamento = client.get(
            reverse("dimensionamento-por-projeto", kwargs={"projeto_id": uuid4()})
        )
        assert catalogo.status_code == 200
        # Passou pela permissão e falhou depois por projeto inexistente.
        assert dimensionamento.status_code == 404

    def test_almoxarifado_cannot_generate_suggestions(self, user_almoxarifado):
        user, secret = user_almoxarifado
        client = _auth_client(user.email, secret)
        response = client.post(
            reverse("composicao-projeto-gerar-sugestoes", kwargs={"projeto_id": uuid4()}),
            {},
            format="json",
        )
        assert response.status_code == 403

    def test_almoxarifado_can_export_lists(self, user_almoxarifado):
        user, secret = user_almoxarifado
        client = _auth_client(user.email, secret)
        xlsx = client.get(
            reverse("composicao-projeto-export-xlsx", kwargs={"projeto_id": uuid4()})
        )
        pdf = client.get(
            reverse("composicao-projeto-export-pdf", kwargs={"projeto_id": uuid4()})
        )
        # Sem projeto válido retorna 404, confirmando que passou na autorização.
        assert xlsx.status_code == 404
        assert pdf.status_code == 404
