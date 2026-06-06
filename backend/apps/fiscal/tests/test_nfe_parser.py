from decimal import Decimal

import pytest

from apps.fiscal.services.nfe_parser import NFeParserError, parse_nfe_xml
from apps.fiscal.tests.fixtures_nfe_xml import (
    CHAVE_NFE_RAIZ,
    CHAVE_NFE_TESTE,
    XML_NFE_PROC,
    XML_NFE_RAIZ,
)


@pytest.mark.django_db
class TestNfeParser:
    def test_parse_nfe_proc(self):
        data = parse_nfe_xml(XML_NFE_PROC)
        assert data["chave_acesso"] == CHAVE_NFE_TESTE
        assert data["numero"] == "100"
        assert data["serie"] == "1"
        assert data["natureza_operacao"] == "Venda de mercadoria"
        assert data["emitente"]["cnpj"] == "12345678000199"
        assert data["destinatario"]["cnpj"] == "98765432000188"
        assert data["valor_total"] == Decimal("52.50")
        assert len(data["itens"]) == 1
        item = data["itens"][0]
        assert item["numero_item"] == 1
        assert item["codigo_fornecedor"] == "FAB-001"
        assert item["descricao"] == "Produto linha fiscal"
        assert item["ncm"] == "85444200"
        assert item["cfop"] == "5102"
        assert item["quantidade"] == Decimal("5.0000")

    def test_parse_raiz_nfe(self):
        data = parse_nfe_xml(XML_NFE_RAIZ)
        assert data["chave_acesso"] == CHAVE_NFE_RAIZ
        assert data["numero"] == "200"
        assert data["serie"] == "2"
        assert data["data_emissao"] is not None
        assert data["emitente"]["nome"] == "Emitente Raiz NFe"
        assert data["valor_total"] == Decimal("100.00")

    def test_xml_invalido(self):
        with pytest.raises(NFeParserError, match="malformado"):
            parse_nfe_xml("<xml")

    def test_sem_chave(self):
        xml = """<?xml version="1.0"?><nfeProc xmlns="http://www.portalfiscal.inf.br/nfe">
        <NFe><infNFe Id="NFe123"><ide><nNF>1</nNF><serie>1</serie></ide>
        <emit><CNPJ>12345678000199</CNPJ></emit>
        <dest><CNPJ>98765432000188</CNPJ></dest>
        </infNFe></NFe></nfeProc>"""
        with pytest.raises(NFeParserError, match="Chave"):
            parse_nfe_xml(xml)

    def test_sem_emitente(self):
        xml = f"""<?xml version="1.0"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe{CHAVE_NFE_TESTE}"><ide><nNF>1</nNF><serie>1</serie></ide>
        <dest><CNPJ>98765432000188</CNPJ></dest></infNFe></NFe>"""
        with pytest.raises(NFeParserError, match="Emitente"):
            parse_nfe_xml(xml)

    def test_sem_destinatario(self):
        xml = f"""<?xml version="1.0"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe">
        <infNFe Id="NFe{CHAVE_NFE_TESTE}"><ide><nNF>1</nNF><serie>1</serie></ide>
        <emit><CNPJ>12345678000199</CNPJ></emit></infNFe></NFe>"""
        with pytest.raises(NFeParserError, match="Destinatário"):
            parse_nfe_xml(xml)
