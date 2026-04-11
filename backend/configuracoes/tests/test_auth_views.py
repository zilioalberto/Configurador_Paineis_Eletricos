import secrets

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestAuthTokenObtain:
    def test_obtain_pair_success(self):
        raw_secret = secrets.token_urlsafe(32)
        User.objects.create_user(
            email="auth-token@test.com",
            password=raw_secret,
            is_active=True,
        )
        client = APIClient()
        response = client.post(
            reverse("token_obtain_pair"),
            {"email": "auth-token@test.com", "password": raw_secret},
            format="json",
        )
        assert response.status_code == 200
        assert "access" in response.data
        assert "refresh" in response.data

    def test_obtain_pair_invalid_credentials(self):
        client = APIClient()
        unknown_secret = secrets.token_urlsafe(32)
        response = client.post(
            reverse("token_obtain_pair"),
            {"email": "missing@test.com", "password": unknown_secret},
            format="json",
        )
        assert response.status_code == 401


@pytest.mark.django_db
class TestAuthMeView:
    def test_me_requires_auth(self):
        client = APIClient()
        response = client.get(reverse("auth_me"))
        assert response.status_code in (401, 403)

    def test_me_returns_profile_with_jwt(self):
        raw_secret = secrets.token_urlsafe(32)
        User.objects.create_user(
            email="auth-me@test.com",
            password=raw_secret,
            first_name="Ana",
            last_name="Silva",
            is_active=True,
        )
        client = APIClient()
        token_response = client.post(
            reverse("token_obtain_pair"),
            {"email": "auth-me@test.com", "password": raw_secret},
            format="json",
        )
        assert token_response.status_code == 200
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")
        response = client.get(reverse("auth_me"))
        assert response.status_code == 200
        assert response.data["email"] == "auth-me@test.com"
        assert response.data["first_name"] == "Ana"
        assert response.data["last_name"] == "Silva"
        assert response.data["tipo_usuario"] == "USUARIO"


@pytest.mark.django_db
class TestProtectedAuthTestView:
    def test_protected_test_with_jwt(self):
        raw_secret = secrets.token_urlsafe(32)
        User.objects.create_user(
            email="auth-protected@test.com",
            password=raw_secret,
            is_active=True,
        )
        client = APIClient()
        token_response = client.post(
            reverse("token_obtain_pair"),
            {"email": "auth-protected@test.com", "password": raw_secret},
            format="json",
        )
        client.credentials(HTTP_AUTHORIZATION=f"Bearer {token_response.data['access']}")
        response = client.get(reverse("test_auth"))
        assert response.status_code == 200
        assert response.data["user"] == "auth-protected@test.com"
        assert "message" in response.data
