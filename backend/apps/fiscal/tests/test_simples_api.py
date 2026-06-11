import pytest
from rest_framework import status

from apps.fiscal.models import DocumentoFiscalEmitido
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_PROC

IMPORT_EMITIDA_URL = "/api/v1/fiscal/nfes-emitidas/importar-manual/"
IMPORT_LOTE_URL = "/api/v1/fiscal/nfes-emitidas/importar-lote/"
FATURAMENTO_URL = "/api/v1/fiscal/simples/faturamento/"
PROJECAO_URL = "/api/v1/fiscal/simples/projecao-das/"
PERFIL_URL = "/api/v1/fiscal/simples/perfil/"


@pytest.mark.django_db
class TestSimplesNacionalApi:
    def test_import_emitida_classifica_cfop_5102(
        self, jwt_client, fiscal_cnpj_settings
    ):
        resp = jwt_client.post(
            IMPORT_EMITIDA_URL,
            {"xml": XML_NFE_PROC},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        doc = DocumentoFiscalEmitido.objects.get(pk=resp.data["documento_id"])
        assert doc.cfop_predominante == "5102"
        assert doc.anexo_simples == "I"
        assert doc.objetivo_saida == "VENDA_PRODUTO"
        assert doc.incluir_faturamento is True

    def test_import_lote(self, jwt_client, fiscal_cnpj_settings):
        resp = jwt_client.post(
            IMPORT_LOTE_URL,
            {"xmls": [XML_NFE_PROC]},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["criados"] == 1

    def test_faturamento_e_projecao(self, jwt_client, fiscal_cnpj_settings):
        jwt_client.post(IMPORT_EMITIDA_URL, {"xml": XML_NFE_PROC}, format="json")
        fat = jwt_client.get(FATURAMENTO_URL)
        assert fat.status_code == status.HTTP_200_OK
        assert fat.data["cnpj"] == "12345678000199"
        assert len(fat.data["meses"]) == 12

        proj = jwt_client.get(PROJECAO_URL, {"competencia": "2024-01"})
        assert proj.status_code == status.HTTP_200_OK
        assert "das_estimado_total" in proj.data
        assert proj.data["avisos"]

    def test_perfil_patch(self, jwt_client, fiscal_cnpj_settings):
        resp = jwt_client.patch(
            PERFIL_URL,
            {"folha_salarios_12m": "120000.00", "encargos_folha_12m": "30000.00"},
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["folha_salarios_12m"] == "120000.00"
