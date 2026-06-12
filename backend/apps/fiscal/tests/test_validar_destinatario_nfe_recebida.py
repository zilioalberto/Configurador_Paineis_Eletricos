import pytest
from django.test import override_settings
from rest_framework import status

from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.services.nfe_parser import NFeParserError
from apps.fiscal.services.validar_destinatario_nfe_recebida import (
    validar_destinatario_nfe_recebida,
)
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_PROC

IMPORT_RECEBIDA_URL = "/api/v1/fiscal/nfes/importar-manual/"
CNPJ_DESTINATARIO_FIXTURE = "98765432000188"
CNPJ_ZFW = "07284171000139"


@pytest.mark.django_db
class TestValidarDestinatarioNfeRecebida:
    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_rejeita_destinatario_diferente_da_empresa(self):
        with pytest.raises(NFeParserError) as exc:
            validar_destinatario_nfe_recebida(
                {"cnpj": CNPJ_DESTINATARIO_FIXTURE, "nome": "Outra empresa"},
            )
        assert CNPJ_ZFW in str(exc.value)
        assert CNPJ_DESTINATARIO_FIXTURE in str(exc.value)

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_DESTINATARIO_FIXTURE)
    def test_aceita_destinatario_da_empresa(self):
        validar_destinatario_nfe_recebida(
            {"cnpj": CNPJ_DESTINATARIO_FIXTURE, "nome": "ZFW Engenharia"},
        )

    @override_settings(FISCAL_EMPRESA_CNPJ="")
    def test_exige_cnpj_configurado(self):
        with pytest.raises(NFeParserError) as exc:
            validar_destinatario_nfe_recebida(
                {"cnpj": CNPJ_DESTINATARIO_FIXTURE, "nome": "ZFW"},
            )
        assert "FISCAL_EMPRESA_CNPJ" in str(exc.value)

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_importacao_rejeita_nfe_destinada_a_outra_empresa(self):
        with pytest.raises(NFeParserError) as exc:
            importar_xml_nfe(xml=XML_NFE_PROC)
        assert CNPJ_ZFW in str(exc.value)
        assert CNPJ_DESTINATARIO_FIXTURE in str(exc.value)

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_DESTINATARIO_FIXTURE)
    def test_importacao_aceita_nfe_recebida_pela_empresa(self):
        resultado = importar_xml_nfe(xml=XML_NFE_PROC)
        assert resultado["created"] is True
        assert resultado["documento"].cnpj_destinatario == CNPJ_DESTINATARIO_FIXTURE


@pytest.mark.django_db
class TestImportarRecebidaApiCnpj:
    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_api_rejeita_destinatario_incorreto(self, jwt_client):
        resp = jwt_client.post(IMPORT_RECEBIDA_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "empresa configurada" in resp.data["detail"].lower()
