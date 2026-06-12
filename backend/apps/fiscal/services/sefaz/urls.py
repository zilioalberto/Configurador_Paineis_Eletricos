"""URLs dos webservices SEFAZ (ambiente nacional)."""

from .xml_namespaces import NS_DIST_DFE, NS_NFE, NS_RECEPCAO_EVENTO

DIST_DFE = {
    "1": "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
    "2": "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx",
}

RECEPCAO_EVENTO = {
    "1": "https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
    "2": "https://hom1.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx",
}

__all__ = [
    "DIST_DFE",
    "NS_DIST_DFE",
    "NS_NFE",
    "NS_RECEPCAO_EVENTO",
    "RECEPCAO_EVENTO",
]
