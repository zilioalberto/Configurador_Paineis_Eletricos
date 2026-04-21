import secrets

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from core.choices import DEFAULT_PERMISSIONS_BY_TIPO, TipoUsuarioChoices
from core.permissions import PermissionKeys

User = get_user_model()


@pytest.fixture
def admin_user():
    raw = secrets.token_urlsafe(32)
    return User.objects.create_user(
        email="admin-users@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    ), raw


@pytest.fixture
def normal_user():
    raw = secrets.token_urlsafe(32)
    return User.objects.create_user(
        email="normal-users@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
    ), raw


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


@pytest.mark.django_db
class TestAdminUsersApi:
    def test_list_forbidden_for_non_admin(self, normal_user):
        user, secret = normal_user
        client = _auth_client(user.email, secret)
        response = client.get(reverse("auth_users_list_create"))
        assert response.status_code == 403

    def test_tipo_choices_forbidden_for_non_admin(self, normal_user):
        user, secret = normal_user
        client = _auth_client(user.email, secret)
        response = client.get(reverse("auth_user_tipo_choices"))
        assert response.status_code == 403

    def test_list_ok_for_admin(self, admin_user):
        user, secret = admin_user
        client = _auth_client(user.email, secret)
        response = client.get(reverse("auth_users_list_create"))
        assert response.status_code == 200
        assert isinstance(response.data, list)
        assert len(response.data) >= 1

    def test_tipo_choices_ok_for_admin(self, admin_user):
        user, secret = admin_user
        client = _auth_client(user.email, secret)
        response = client.get(reverse("auth_user_tipo_choices"))
        assert response.status_code == 200
        values = {row["value"] for row in response.data}
        for choice in TipoUsuarioChoices:
            assert choice.value in values

    def test_create_user(self, admin_user):
        admin, secret = admin_user
        client = _auth_client(admin.email, secret)
        new_secret = secrets.token_urlsafe(32)
        response = client.post(
            reverse("auth_users_list_create"),
            {
                "email": "novo-utilizador@test.com",
                "password": new_secret,
                "first_name": "Novo",
                "last_name": "Utilizador",
                "telefone": "",
                "tipo_usuario": TipoUsuarioChoices.USUARIO,
                "is_active": True,
            },
            format="json",
        )
        assert response.status_code == 201
        assert response.data["email"] == "novo-utilizador@test.com"
        assert User.objects.filter(email="novo-utilizador@test.com").exists()

    def test_update_user_tipo(self, admin_user, normal_user):
        admin, asec = admin_user
        other, _ = normal_user
        client = _auth_client(admin.email, asec)
        response = client.patch(
            reverse("auth_users_detail", kwargs={"pk": other.pk}),
            {"tipo_usuario": TipoUsuarioChoices.ADMIN},
            format="json",
        )
        assert response.status_code == 200
        other.refresh_from_db()
        assert other.tipo_usuario == TipoUsuarioChoices.ADMIN

    def test_permission_options_ok_for_admin(self, admin_user):
        user, secret = admin_user
        client = _auth_client(user.email, secret)
        response = client.get(reverse("auth_user_permission_options"))
        assert response.status_code == 200
        assert "permissions" in response.data
        assert "defaults_by_tipo" in response.data
        assert TipoUsuarioChoices.ADMIN in response.data["defaults_by_tipo"]

    def test_create_user_with_custom_permissions(self, admin_user):
        admin, secret = admin_user
        client = _auth_client(admin.email, secret)
        selected = sorted(
            {
                PermissionKeys.PROJETO_VISUALIZAR,
                PermissionKeys.ORCAMENTO_CRIAR,
                PermissionKeys.MATERIAL_VISUALIZAR_LISTA,
            }
        )
        response = client.post(
            reverse("auth_users_list_create"),
            {
                "email": "custom-perm@test.com",
                "password": secrets.token_urlsafe(32),
                "first_name": "Perm",
                "last_name": "Custom",
                "telefone": "",
                "tipo_usuario": TipoUsuarioChoices.USUARIO,
                "permissoes": selected,
                "is_active": True,
            },
            format="json",
        )
        assert response.status_code == 201
        created = User.objects.get(email="custom-perm@test.com")
        assert sorted(created.permissoes_efetivas) == selected
        defaults = DEFAULT_PERMISSIONS_BY_TIPO[TipoUsuarioChoices.USUARIO]
        assert set(created.permissoes_extras) == (set(selected) - set(defaults))
        assert set(created.permissoes_negadas) == (set(defaults) - set(selected))
