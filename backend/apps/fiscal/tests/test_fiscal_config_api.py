import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()
URL = "/api/v1/fiscal/config/"


@pytest.fixture
def jwt_client():
    client = APIClient()
    user = User.objects.create_user(
        email="fiscal-config@test.com",
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


@pytest.mark.django_db
class TestFiscalModuloConfigApi:
    @override_settings(
        FISCAL_EMPRESA_CNPJ="12.345.678/0001-99",
        FISCAL_CERT_PATH="/secrets/cert.pfx",
        FISCAL_CERT_PASSWORD="senha",
        FISCAL_SEFAZ_PROVIDER="native",
    )
    def test_retorna_cnpj_e_sefaz_configurado(self, jwt_client):
        resp = jwt_client.get(URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["cnpj_empresa"] == "12345678000199"
        assert resp.data["sefaz_sync_configurado"] is True
        assert resp.data["agente_ponte_configurado"] is True

    @override_settings(
        FISCAL_EMPRESA_CNPJ="12.345.678/0001-99",
        FISCAL_SEFAZ_PROVIDER="stub",
    )
    def test_stub_habilita_sync_sem_certificado(self, jwt_client):
        resp = jwt_client.get(URL)
        assert resp.data["sefaz_sync_configurado"] is True

    @override_settings(FISCAL_EMPRESA_CNPJ="", FISCAL_AGENT_TOKEN="")
    def test_cnpj_vazio_quando_nao_configurado(self, jwt_client):
        resp = jwt_client.get(URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["cnpj_empresa"] == ""
        assert resp.data["sefaz_sync_configurado"] is False
        assert resp.data["agente_ponte_configurado"] is False
