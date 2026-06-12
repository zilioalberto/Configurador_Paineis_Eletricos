import pytest
from django.test import override_settings

from apps.fiscal.models import DocumentoFiscalEmitido, DocumentoFiscalRecebido
from apps.fiscal.services.documentos_fiscais_divergentes import (
    queryset_emitidas_emitente_divergente,
    queryset_recebidas_destinatario_divergente,
)
from apps.fiscal.services.importar_xml_documento_emitido_service import (
    importar_xml_documento_emitido,
)
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_PROC

CNPJ_ZFW = "07284171000139"
CNPJ_DEST_FIXTURE = "98765432000188"
CNPJ_EMIT_FIXTURE = "12345678000199"


@pytest.mark.django_db
class TestDocumentosFiscaisDivergentes:
    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_emitida_com_emitente_fornecedor_aparece_na_listagem(self):
        DocumentoFiscalEmitido.objects.create(
            identificador="TEST:EMITIDA-DIVERGENTE",
            tipo_documento="NFE_PRODUTO",
            cnpj_emitente=CNPJ_EMIT_FIXTURE,
            nome_emitente="Fornecedor errado",
            cnpj_destinatario=CNPJ_ZFW,
            nome_destinatario="ZFW",
            numero="999",
            serie="1",
            valor_total="100.00",
        )
        DocumentoFiscalEmitido.objects.create(
            identificador="TEST:EMITIDA-OK",
            tipo_documento="NFE_PRODUTO",
            cnpj_emitente=CNPJ_ZFW,
            nome_emitente="ZFW Engenharia",
            cnpj_destinatario="11111111000111",
            nome_destinatario="Cliente",
            numero="998",
            serie="1",
            valor_total="200.00",
        )

        divergentes = list(queryset_emitidas_emitente_divergente())
        assert len(divergentes) == 1
        assert divergentes[0].numero == "999"

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
    def test_recebida_com_destinatario_errado_aparece_na_listagem(self):
        DocumentoFiscalRecebido.objects.create(
            chave_acesso="35260111222333000199550010000009991234567899",
            cnpj_emitente=CNPJ_EMIT_FIXTURE,
            nome_emitente="Fornecedor",
            cnpj_destinatario=CNPJ_DEST_FIXTURE,
            nome_destinatario="Outro destinatário",
            numero="888",
            serie="1",
            valor_total="50.00",
            xml_original="<nfeProc />",
        )
        DocumentoFiscalRecebido.objects.create(
            chave_acesso="35260111222333000199550010000008881234567899",
            cnpj_emitente=CNPJ_EMIT_FIXTURE,
            nome_emitente="Fornecedor",
            cnpj_destinatario=CNPJ_ZFW,
            nome_destinatario="ZFW",
            numero="887",
            serie="1",
            valor_total="60.00",
            xml_original="<nfeProc />",
        )

        divergentes = list(queryset_recebidas_destinatario_divergente())
        assert len(divergentes) == 1
        assert divergentes[0].numero == "888"

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_EMIT_FIXTURE)
    def test_importacao_atual_nao_entra_na_listagem_de_emitidas(self):
        importar_xml_documento_emitido(
            xml=XML_NFE_PROC,
            tipo_documento="NFE_PRODUTO",
        )
        assert queryset_emitidas_emitente_divergente().count() == 0

    @override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_DEST_FIXTURE)
    def test_importacao_atual_nao_entra_na_listagem_de_recebidas(self):
        importar_xml_nfe(xml=XML_NFE_PROC)
        assert queryset_recebidas_destinatario_divergente().count() == 0
