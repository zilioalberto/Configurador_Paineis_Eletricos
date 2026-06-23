import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.fiscal.choices import (
    StatusDocumentoSefazDistribuidoChoices,
    StatusManifestacaoDestinatarioChoices,
    TipoManifestacaoDestinatarioChoices,
)
from apps.fiscal.models import DocumentoFiscalRecebido, DocumentoSefazDistribuido
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.services.manifestacao_destinatario_service import (
    ManifestacaoDestinatarioError,
    registrar_resultado_manifestacao,
    solicitar_manifestacao_destinatario,
)
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_PROC
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()


@pytest.fixture
def documento(db, fiscal_cnpj_recebidas_settings):
    del fiscal_cnpj_recebidas_settings
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

    def test_solicitar_resumo_sefaz_coloca_pendente(self):
        documento = DocumentoSefazDistribuido.objects.create(
            chave_acesso="42260614456688000123550010001758931534438781",
            nsu="000000000004188",
            cnpj_destinatario="07284171000139",
        )

        solicitar_manifestacao_destinatario(
            documento,
            tipo=TipoManifestacaoDestinatarioChoices.CIENCIA,
        )

        documento.refresh_from_db()
        assert documento.manifestacao_status == StatusManifestacaoDestinatarioChoices.PENDENTE
        assert documento.status == StatusDocumentoSefazDistribuidoChoices.AGUARDANDO_MANIFESTACAO

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
    def test_solicitar_jwt(self, jwt_client, documento):
        url = f"/api/v1/fiscal/nfes/{documento.id}/solicitar-manifestacao/"
        resp = jwt_client.post(url, {"tipo": "CIENCIA"}, format="json")
        assert resp.status_code == status.HTTP_202_ACCEPTED
        documento.refresh_from_db()
        assert documento.manifestacao_status == "PENDENTE"
