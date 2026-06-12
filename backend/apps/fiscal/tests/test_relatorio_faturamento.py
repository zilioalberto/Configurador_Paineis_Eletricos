import pytest
from django.contrib.auth import get_user_model
from rest_framework import status
from rest_framework.test import APIClient

from apps.fiscal.models import DocumentoFiscalEmitido
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()
from apps.fiscal.services.importar_xml_documento_emitido_service import importar_xml_documento_emitido
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_PROC

RELATORIO_URL = "/api/v1/fiscal/relatorios/faturamento/"
NFES_EMITIDAS_URL = "/api/v1/fiscal/nfes-emitidas/"


@pytest.mark.django_db
class TestRelatorioFaturamentoApi:
    def test_relatorio_por_mes_e_cliente(self, jwt_client, fiscal_cnpj_settings):
        importar_xml_documento_emitido(xml=XML_NFE_PROC)
        resp = jwt_client.get(RELATORIO_URL, {"data_inicio": "2024-01-01", "data_fim": "2024-12-31"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["resumo"]["quantidade_documentos"] == 1
        assert float(resp.data["resumo"]["valor_total"]) == 52.50
        assert len(resp.data["por_mes"]) >= 1
        assert len(resp.data["por_cliente"]) == 1
        assert resp.data["por_cliente"][0]["cnpj_destinatario"] == "98765432000188"

    def test_filtro_cliente(self, jwt_client, fiscal_cnpj_settings):
        importar_xml_documento_emitido(xml=XML_NFE_PROC)
        resp = jwt_client.get(
            RELATORIO_URL,
            {"data_inicio": "2024-01-01", "data_fim": "2024-12-31", "cliente": "ZFW Engenharia"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["resumo"]["quantidade_documentos"] == 1

        resp_vazio = jwt_client.get(
            RELATORIO_URL,
            {"data_inicio": "2024-01-01", "data_fim": "2024-12-31", "cliente": "inexistente xyz"},
        )
        assert resp_vazio.data["resumo"]["quantidade_documentos"] == 0

    def test_filtro_anexo_servico_e_tipo(self, jwt_client, fiscal_cnpj_settings):
        resultado = importar_xml_documento_emitido(xml=XML_NFE_PROC)
        DocumentoFiscalEmitido.objects.filter(pk=resultado["documento"].id).update(anexo_simples="")

        resp_servico = jwt_client.get(
            RELATORIO_URL,
            {"data_inicio": "2024-01-01", "data_fim": "2024-12-31", "anexo_simples": "SERVICO"},
        )
        assert resp_servico.status_code == status.HTTP_200_OK
        assert resp_servico.data["resumo"]["quantidade_documentos"] == 1

        resp_anexo_i = jwt_client.get(
            RELATORIO_URL,
            {"data_inicio": "2024-01-01", "data_fim": "2024-12-31", "anexo_simples": "I"},
        )
        assert resp_anexo_i.data["resumo"]["quantidade_documentos"] == 0

        resp_tipo = jwt_client.get(
            RELATORIO_URL,
            {
                "data_inicio": "2024-01-01",
                "data_fim": "2024-12-31",
                "tipo_documento": "NFE_PRODUTO",
            },
        )
        assert resp_tipo.data["resumo"]["quantidade_documentos"] == 1

    def test_listagem_emitidas_filtra_periodo(self, jwt_client, fiscal_cnpj_settings):
        resultado = importar_xml_documento_emitido(xml=XML_NFE_PROC)
        DocumentoFiscalEmitido.objects.filter(pk=resultado["documento"].id).update(
            data_emissao="2026-06-10T10:00:00-03:00"
        )

        resp = jwt_client.get(
            NFES_EMITIDAS_URL,
            {"data_inicio": "2026-06-01", "data_fim": "2026-06-30"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["count"] == 1

        resp_vazio = jwt_client.get(
            NFES_EMITIDAS_URL,
            {"data_inicio": "2026-07-01", "data_fim": "2026-07-31"},
        )
        assert resp_vazio.data["count"] == 0

    def test_relatorio_exige_fiscal_visualizar(self, fiscal_cnpj_settings):
        client = APIClient()
        user = User.objects.create_user(
            email="sem-fiscal@test.com",
            password="pass12345",
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.USUARIO,
        )
        client.force_authenticate(user)
        resp = client.get(RELATORIO_URL)
        assert resp.status_code == status.HTTP_403_FORBIDDEN

    def test_sem_cnpj_configurado(self, jwt_client, settings):
        settings.FISCAL_EMPRESA_CNPJ = ""
        resp = jwt_client.get(RELATORIO_URL)
        assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
