import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()


@pytest.fixture
def jwt_client():
    client = APIClient()
    user = User.objects.create_user(
        email="fiscal-simples-jwt@test.com",
        password="pass12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.fixture
def fiscal_cnpj_settings():
    """CNPJ do emitente no XML_NFE_PROC de fixtures_nfe_xml."""
    with override_settings(FISCAL_EMPRESA_CNPJ="12345678000199"):
        yield
