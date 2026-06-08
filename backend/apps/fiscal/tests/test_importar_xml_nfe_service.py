import pytest

from apps.fiscal.choices import ObjetivoEntradaFiscalChoices, OrigemImportacaoFiscalChoices
from apps.fiscal.models import DocumentoFiscalRecebido, ItemDocumentoFiscal
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.tests.fixtures_nfe_xml import CHAVE_NFE_TESTE, XML_NFE_PROC


@pytest.mark.django_db
class TestImportarXmlNfeService:
    def test_cria_documento_e_itens(self):
        resultado = importar_xml_nfe(
            xml=XML_NFE_PROC,
            nsu="123",
            origem_importacao=OrigemImportacaoFiscalChoices.MANUAL,
            objetivo_entrada=ObjetivoEntradaFiscalChoices.INDUSTRIALIZACAO,
        )
        assert resultado["created"] is True
        doc = resultado["documento"]
        assert doc.chave_acesso == CHAVE_NFE_TESTE
        assert doc.xml_original == XML_NFE_PROC
        assert doc.nsu == "000000000000123"
        assert doc.origem_importacao == OrigemImportacaoFiscalChoices.MANUAL
        assert doc.objetivo_entrada == ObjetivoEntradaFiscalChoices.INDUSTRIALIZACAO
        assert ItemDocumentoFiscal.objects.filter(documento=doc).count() == 1

    def test_evita_duplicidade(self):
        importar_xml_nfe(xml=XML_NFE_PROC)
        segundo = importar_xml_nfe(xml=XML_NFE_PROC)
        assert segundo["created"] is False
        assert segundo["message"] == "NF-e já cadastrada."
        assert DocumentoFiscalRecebido.objects.filter(chave_acesso=CHAVE_NFE_TESTE).count() == 1

    def test_xml_obrigatorio(self):
        from apps.fiscal.services.nfe_parser import NFeParserError

        with pytest.raises(NFeParserError, match="XML não informado"):
            importar_xml_nfe(xml="")
