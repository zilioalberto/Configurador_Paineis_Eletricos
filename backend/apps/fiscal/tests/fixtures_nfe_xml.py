"""XML de NF-e para testes do módulo fiscal."""

CHAVE_NFE_TESTE = "35200123456789012345678901234567890123456123"
CHAVE_NFE_RAIZ = "35200123456789012345678901234567890123456124"

XML_NFE_PROC = f"""<?xml version="1.0" encoding="UTF-8"?>
<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">
  <NFe>
    <infNFe Id="NFe{CHAVE_NFE_TESTE}">
      <ide>
        <nNF>100</nNF>
        <serie>1</serie>
        <dhEmi>2024-01-15T10:00:00-03:00</dhEmi>
        <natOp>Venda de mercadoria</natOp>
      </ide>
      <emit>
        <CNPJ>12345678000199</CNPJ>
        <xNome>Fornecedor XML Teste LTDA</xNome>
      </emit>
      <dest>
        <CNPJ>98765432000188</CNPJ>
        <xNome>ZFW Engenharia Destinatario</xNome>
      </dest>
      <det nItem="1">
        <prod>
          <cProd>FAB-001</cProd>
          <xProd>Produto linha fiscal</xProd>
          <NCM>85444200</NCM>
          <CFOP>5102</CFOP>
          <uCom>UN</uCom>
          <qCom>5.0000</qCom>
          <vUnCom>10.5000</vUnCom>
          <vProd>52.50</vProd>
        </prod>
      </det>
      <total>
        <ICMSTot>
          <vNF>52.50</vNF>
        </ICMSTot>
      </total>
    </infNFe>
  </NFe>
</nfeProc>
"""

XML_NFE_RAIZ = f"""<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="http://www.portalfiscal.inf.br/nfe">
    <infNFe Id="NFe{CHAVE_NFE_RAIZ}">
    <ide>
      <nNF>200</nNF>
      <serie>2</serie>
      <dEmi>2024-02-01</dEmi>
      <natOp>Compra para industrializacao</natOp>
    </ide>
    <emit>
      <CNPJ>11111111000191</CNPJ>
      <xNome>Emitente Raiz NFe</xNome>
    </emit>
    <dest>
      <CNPJ>98765432000188</CNPJ>
      <xNome>Dest Raiz</xNome>
    </dest>
    <det nItem="1">
      <prod>
        <cProd>COD-2</cProd>
        <xProd>Item raiz NFe</xProd>
        <NCM>12345678</NCM>
        <CFOP>1102</CFOP>
        <uCom>PC</uCom>
        <qCom>1.0000</qCom>
        <vUnCom>100.0000</vUnCom>
        <vProd>100.00</vProd>
      </prod>
    </det>
    <total>
      <ICMSTot>
        <vNF>100.00</vNF>
      </ICMSTot>
    </total>
  </infNFe>
</NFe>
"""
