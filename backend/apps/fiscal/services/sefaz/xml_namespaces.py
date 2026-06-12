"""Identificadores URI de namespaces XML exigidos por W3C, SOAP 1.2 e SEFAZ.

O padrão define URIs com esquema ``http://`` como identificadores estáveis; não são
endpoints acessíveis na rede (requisições reais usam HTTPS em ``urls.py``).
"""
from __future__ import annotations

# Canonicalização XML (W3C XML-DSig) — URI fixa exigida pelo signxml/SEFAZ.
C14N_XML_20010315 = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"  # NOSONAR

XMLNS_XSI = "http://www.w3.org/2001/XMLSchema-instance"  # NOSONAR
XMLNS_XSD = "http://www.w3.org/2001/XMLSchema"  # NOSONAR
XMLNS_SOAP12_ENVELOPE = "http://www.w3.org/2003/05/soap-envelope"  # NOSONAR

NS_DIST_DFE = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"  # NOSONAR
NS_RECEPCAO_EVENTO = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4"  # NOSONAR
NS_NFE = "http://www.portalfiscal.inf.br/nfe"  # NOSONAR


def montar_envelope_soap12(*, body_inner_xml: str) -> str:
    """Monta envelope SOAP 1.2; ``body_inner_xml`` já deve conter o nó da operação SEFAZ."""
    return (
        '<?xml version="1.0" encoding="utf-8"?>'
        f'<soap12:Envelope xmlns:xsi="{XMLNS_XSI}" '
        f'xmlns:xsd="{XMLNS_XSD}" '
        f'xmlns:soap12="{XMLNS_SOAP12_ENVELOPE}">'
        "<soap12:Body>"
        f"{body_inner_xml}"
        "</soap12:Body>"
        "</soap12:Envelope>"
    )
