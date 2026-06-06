import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.fiscal.models import ControleNSU, DocumentoFiscalRecebido
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.tests.fixtures_nfe_xml import CHAVE_NFE_TESTE, XML_NFE_PROC
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()

FISCAL_TEST_TOKEN = "fiscal-agent-test-token-seguro"
IMPORT_URL = "/api/v1/fiscal/nfes/importar-xml/"
IMPORT_PORTAL_URL = "/api/v1/fiscal/nfes/importar-manual/"
NSU_URL = "/api/v1/fiscal/nsu/98765432000188/"


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fiscal_agent_settings():
    with override_settings(FISCAL_AGENT_TOKEN=FISCAL_TEST_TOKEN):
        yield


@pytest.fixture
def jwt_client(api_client):
    user = User.objects.create_user(
        email="fiscal-nfe-jwt@test.com",
        password="pass12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    token = api_client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return api_client


def _autenticar_agente(client: APIClient) -> None:
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {FISCAL_TEST_TOKEN}")


@pytest.mark.django_db
class TestNfeApiAgent:
    def test_importar_sem_token_bloqueia(self, api_client, fiscal_agent_settings):
        api_client.credentials()
        resp = api_client.post(IMPORT_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_importar_token_invalido(self, api_client, fiscal_agent_settings):
        api_client.credentials(HTTP_AUTHORIZATION="Bearer token-errado")
        resp = api_client.post(IMPORT_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_importar_com_token_valido(self, api_client, fiscal_agent_settings):
        _autenticar_agente(api_client)
        resp = api_client.post(
            IMPORT_URL,
            {"xml": XML_NFE_PROC, "origem_importacao": "MANUAL"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] is True
        assert resp.data["chave_acesso"] == CHAVE_NFE_TESTE

    def test_importar_duplicada_retorna_200(self, api_client, fiscal_agent_settings):
        importar_xml_nfe(xml=XML_NFE_PROC)
        _autenticar_agente(api_client)
        resp = api_client.post(IMPORT_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["created"] is False

    def test_importar_xml_invalido_400(self, api_client, fiscal_agent_settings):
        _autenticar_agente(api_client)
        resp = api_client.post(IMPORT_URL, {"xml": "<invalid"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_nsu_sem_token_bloqueia(self, api_client, fiscal_agent_settings):
        api_client.credentials()
        resp = api_client.get(NSU_URL)
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_nsu_get_cria_controle(self, api_client, fiscal_agent_settings):
        _autenticar_agente(api_client)
        resp = api_client.get(NSU_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["cnpj"] == "98765432000188"
        assert resp.data["ultimo_nsu"] == "000000000000000"
        assert ControleNSU.objects.filter(cnpj="98765432000188").exists()

    def test_nsu_patch_atualiza(self, api_client, fiscal_agent_settings):
        _autenticar_agente(api_client)
        api_client.get(NSU_URL)
        resp = api_client.patch(
            NSU_URL,
            {
                "ultimo_nsu": "000000000123456",
                "ultimo_cstat": "137",
                "ultimo_motivo": "Nenhum documento localizado",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["ultimo_nsu"] == "000000000123456"
        assert resp.data["ultimo_cstat"] == "137"

    def test_token_nao_configurado_bloqueia(self, api_client):
        with override_settings(FISCAL_AGENT_TOKEN=""):
            _autenticar_agente(api_client)
            resp = api_client.post(IMPORT_URL, {"xml": XML_NFE_PROC}, format="json")
            assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
class TestNfeApiJwt:
    def test_listar_nfes(self, jwt_client):
        importar_xml_nfe(xml=XML_NFE_PROC)
        resp = jwt_client.get("/api/v1/fiscal/nfes/")
        assert resp.status_code == status.HTTP_200_OK
        assert "results" in resp.data
        chaves = {r["chave_acesso"] for r in resp.data["results"]}
        assert CHAVE_NFE_TESTE in chaves
        primeiro = next(r for r in resp.data["results"] if r["chave_acesso"] == CHAVE_NFE_TESTE)
        assert "xml_original" not in primeiro

    def test_detalhar_nfe(self, jwt_client):
        doc = importar_xml_nfe(xml=XML_NFE_PROC)["documento"]
        resp = jwt_client.get(f"/api/v1/fiscal/nfes/{doc.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["xml_original"] == XML_NFE_PROC
        assert len(resp.data["itens"]) == 1

    def test_filtro_chave(self, jwt_client):
        importar_xml_nfe(xml=XML_NFE_PROC)
        resp = jwt_client.get(
            "/api/v1/fiscal/nfes/",
            {"chave_acesso": CHAVE_NFE_TESTE},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1

    def test_importar_manual_portal(self, jwt_client):
        resp = jwt_client.post(IMPORT_PORTAL_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] is True
        doc = DocumentoFiscalRecebido.objects.get(chave_acesso=CHAVE_NFE_TESTE)
        assert doc.origem_importacao == "MANUAL"

    def test_importar_manual_duplicada(self, jwt_client):
        importar_xml_nfe(xml=XML_NFE_PROC)
        resp = jwt_client.post(IMPORT_PORTAL_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["created"] is False

    def test_nsu_get_jwt(self, jwt_client):
        resp = jwt_client.get(NSU_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["cnpj"] == "98765432000188"

    def test_nsu_patch_jwt_bloqueia(self, jwt_client):
        resp = jwt_client.patch(NSU_URL, {"ultimo_nsu": "000000000000001"}, format="json")
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )
