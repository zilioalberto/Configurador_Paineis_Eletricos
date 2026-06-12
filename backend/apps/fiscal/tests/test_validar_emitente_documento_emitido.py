import pytest
from django.test import override_settings
from rest_framework import status

from apps.fiscal.services.documento_emitido_parser import DocumentoEmitidoParserError
from apps.fiscal.services.importar_xml_documento_emitido_service import importar_xml_documento_emitido
from apps.fiscal.services.validar_emitente_documento_emitido import validar_emitente_documento_emitido
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_PROC

IMPORT_EMITIDA_URL = "/api/v1/fiscal/nfes-emitidas/importar-manual/"
CNPJ_EMITENTE_FIXTURE = "12345678000199"
CNPJ_ZFW = "07284171000139"


@pytest.mark.django_db
class TestValidarEmitenteDocumentoEmitido:
    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_rejeita_emitente_diferente_da_empresa(self):
        with pytest.raises(DocumentoEmitidoParserError) as exc:
            validar_emitente_documento_emitido({"cnpj": CNPJ_EMITENTE_FIXTURE, "nome": "Fornecedor"})
        assert CNPJ_ZFW in str(exc.value)
        assert "emitid" in str(exc.value).lower() or "empresa" in str(exc.value).lower()

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_EMITENTE_FIXTURE)
    def test_aceita_emitente_da_empresa(self):
        validar_emitente_documento_emitido(
            {"cnpj": CNPJ_EMITENTE_FIXTURE, "nome": "ZFW Engenharia"},
        )

    @override_settings(FISCAL_EMPRESA_CNPJ="")
    def test_exige_cnpj_configurado(self):
        with pytest.raises(DocumentoEmitidoParserError) as exc:
            validar_emitente_documento_emitido({"cnpj": CNPJ_EMITENTE_FIXTURE, "nome": "X"})
        assert "FISCAL_EMPRESA_CNPJ" in str(exc.value)

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_importacao_rejeita_nfe_de_fornecedor(self):
        with pytest.raises(DocumentoEmitidoParserError) as exc:
            importar_xml_documento_emitido(xml=XML_NFE_PROC)
        assert CNPJ_ZFW in str(exc.value)
        assert CNPJ_EMITENTE_FIXTURE in str(exc.value)

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_EMITENTE_FIXTURE)
    def test_importacao_aceita_nfe_emitida_pela_empresa(self):
        resultado = importar_xml_documento_emitido(xml=XML_NFE_PROC)
        assert resultado["created"] is True
        assert resultado["documento"].cnpj_emitente == CNPJ_EMITENTE_FIXTURE


@pytest.mark.django_db
class TestImportarEmitidaApiCnpj:
    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_api_rejeita_emitente_incorreto(self, jwt_client):
        resp = jwt_client.post(IMPORT_EMITIDA_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST
        assert "empresa configurada" in resp.data["detail"].lower()
