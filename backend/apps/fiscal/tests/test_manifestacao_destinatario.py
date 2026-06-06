import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.fiscal.choices import (
    StatusManifestacaoDestinatarioChoices,
    TipoManifestacaoDestinatarioChoices,
)
from apps.fiscal.models import DocumentoFiscalRecebido
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.services.manifestacao_destinatario_service import (
    ManifestacaoDestinatarioError,
    registrar_resultado_manifestacao,
    solicitar_manifestacao_destinatario,
)
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_PROC
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()
AGENT_TOKEN = "manifest-agent-token-test"
PENDENTES_URL = "/api/v1/fiscal/nfes/manifestacoes-pendentes/"


@pytest.fixture
def documento(db):
    return importar_xml_nfe(xml=XML_NFE_PROC)["documento"]


@pytest.fixture
def jwt_client():
    client = APIClient()
    user = User.objects.create_user(
        email="manifest-jwt@test.com",
        password="pass12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.fixture
def agent_client():
    client = APIClient()
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {AGENT_TOKEN}")
    return client


@pytest.mark.django_db
class TestManifestacaoService:
    def test_solicitar_coloca_pendente(self, documento):
        solicitar_manifestacao_destinatario(
            documento,
            tipo=TipoManifestacaoDestinatarioChoices.CIENCIA,
        )
        documento.refresh_from_db()
        assert documento.manifestacao_status == StatusManifestacaoDestinatarioChoices.PENDENTE
        assert documento.manifestacao_tipo == TipoManifestacaoDestinatarioChoices.CIENCIA

    def test_nao_realizada_exige_justificativa(self, documento):
        with pytest.raises(ManifestacaoDestinatarioError):
            solicitar_manifestacao_destinatario(
                documento,
                tipo=TipoManifestacaoDestinatarioChoices.NAO_REALIZADA,
                justificativa="curta",
            )

    def test_registrar_sucesso(self, documento):
        solicitar_manifestacao_destinatario(
            documento,
            tipo=TipoManifestacaoDestinatarioChoices.CONFIRMACAO,
        )
        registrar_resultado_manifestacao(
            documento,
            sucesso=True,
            protocolo="123",
            cstat="135",
            motivo="Evento registrado",
        )
        documento.refresh_from_db()
        assert documento.manifestacao_status == StatusManifestacaoDestinatarioChoices.MANIFESTADA
        assert documento.manifestacao_protocolo == "123"


@pytest.mark.django_db
class TestManifestacaoApi:
    @override_settings(FISCAL_AGENT_TOKEN=AGENT_TOKEN)
    def test_solicitar_jwt(self, jwt_client, documento):
        url = f"/api/v1/fiscal/nfes/{documento.id}/solicitar-manifestacao/"
        resp = jwt_client.post(url, {"tipo": "CIENCIA"}, format="json")
        assert resp.status_code == status.HTTP_202_ACCEPTED
        documento.refresh_from_db()
        assert documento.manifestacao_status == "PENDENTE"

    @override_settings(FISCAL_AGENT_TOKEN=AGENT_TOKEN)
    def test_pendentes_agent(self, agent_client, documento):
        solicitar_manifestacao_destinatario(
            documento,
            tipo=TipoManifestacaoDestinatarioChoices.CIENCIA,
        )
        resp = agent_client.get(PENDENTES_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data) == 1
        assert resp.data[0]["id"] == documento.id

    @override_settings(FISCAL_AGENT_TOKEN=AGENT_TOKEN)
    def test_registrar_agent(self, agent_client, documento):
        solicitar_manifestacao_destinatario(
            documento,
            tipo=TipoManifestacaoDestinatarioChoices.CIENCIA,
        )
        url = f"/api/v1/fiscal/nfes/{documento.id}/registrar-manifestacao/"
        resp = agent_client.post(
            url,
            {"sucesso": True, "protocolo": "999", "cstat": "135"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        documento.refresh_from_db()
        assert documento.manifestacao_status == "MANIFESTADA"
