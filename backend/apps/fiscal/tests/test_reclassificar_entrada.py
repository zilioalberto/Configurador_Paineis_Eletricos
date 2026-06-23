"""Testes de classificação automática (CFOP) e reclassificação manual de entradas."""
import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.fiscal.choices import (
    ClassificacaoFiscalOrigemChoices,
    ObjetivoEntradaFiscalChoices,
)
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_RAIZ
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()


@pytest.fixture
def jwt_client():
    client = APIClient()
    user = User.objects.create_user(
        email="reclassif@test.com",
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
@pytest.mark.usefixtures("fiscal_cnpj_recebidas_settings")
class TestClassificacaoAutomaticaImport:
    def test_import_classifica_por_cfop(self):
        doc = importar_xml_nfe(xml=XML_NFE_RAIZ)["documento"]
        assert doc.objetivo_entrada == ObjetivoEntradaFiscalChoices.REVENDA
        assert doc.classificacao_origem == ClassificacaoFiscalOrigemChoices.AUTOMATICA
        assert doc.cfop_predominante == "1102"
        item = doc.itens.first()
        assert item.objetivo_entrada == ObjetivoEntradaFiscalChoices.REVENDA

    def test_objetivo_explicito_vira_manual(self):
        doc = importar_xml_nfe(
            xml=XML_NFE_RAIZ,
            objetivo_entrada=ObjetivoEntradaFiscalChoices.USO_CONSUMO,
        )["documento"]
        assert doc.objetivo_entrada == ObjetivoEntradaFiscalChoices.USO_CONSUMO
        assert doc.classificacao_origem == ClassificacaoFiscalOrigemChoices.MANUAL


@pytest.mark.django_db
@pytest.mark.usefixtures("fiscal_cnpj_recebidas_settings")
class TestReclassificarEntradaApi:
    def test_reclassificar_nota(self, jwt_client):
        doc = importar_xml_nfe(xml=XML_NFE_RAIZ)["documento"]
        url = reverse("fiscal-nfe-reclassificar", kwargs={"documento_id": doc.id})
        resp = jwt_client.patch(
            url,
            {"objetivo_entrada": ObjetivoEntradaFiscalChoices.ATIVO_IMOBILIZADO},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["objetivo_entrada"] == ObjetivoEntradaFiscalChoices.ATIVO_IMOBILIZADO
        assert resp.data["classificacao_origem"] == ClassificacaoFiscalOrigemChoices.MANUAL

    def test_reclassificar_item_atualiza_predominante(self, jwt_client):
        doc = importar_xml_nfe(xml=XML_NFE_RAIZ)["documento"]
        item = doc.itens.first()
        url = reverse("fiscal-nfe-reclassificar", kwargs={"documento_id": doc.id})
        resp = jwt_client.patch(
            url,
            {
                "itens": [
                    {
                        "item_id": item.id,
                        "objetivo_entrada": ObjetivoEntradaFiscalChoices.USO_CONSUMO,
                    }
                ]
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        item_data = resp.data["itens"][0]
        assert item_data["objetivo_entrada"] == ObjetivoEntradaFiscalChoices.USO_CONSUMO
        assert item_data["classificacao_origem"] == ClassificacaoFiscalOrigemChoices.MANUAL
        assert resp.data["objetivo_entrada"] == ObjetivoEntradaFiscalChoices.USO_CONSUMO

    def test_reclassificar_sem_dados_falha(self, jwt_client):
        doc = importar_xml_nfe(xml=XML_NFE_RAIZ)["documento"]
        url = reverse("fiscal-nfe-reclassificar", kwargs={"documento_id": doc.id})
        resp = jwt_client.patch(url, {}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_reclassificar_documento_inexistente(self, jwt_client):
        url = reverse("fiscal-nfe-reclassificar", kwargs={"documento_id": 999999})
        resp = jwt_client.patch(
            url,
            {"objetivo_entrada": ObjetivoEntradaFiscalChoices.REVENDA},
            format="json",
        )
        assert resp.status_code == status.HTTP_404_NOT_FOUND
