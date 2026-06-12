"""Parser da resposta SOAP da Distribuição DFe."""
from __future__ import annotations

import base64
import gzip
import re
from dataclasses import dataclass, field
from xml.etree import ElementTree as ET

from apps.fiscal.utils import normalizar_nsu

from .xml_namespaces import NS_NFE

NS = {"nfe": NS_NFE}


@dataclass
class DistDfeDocumento:
    xml: str
    nsu: str | None = None
    schema: str | None = None


@dataclass
class DistDfeResultado:
    cstat: str
    xmotivo: str
    ultimo_nsu: str
    max_nsu: str
    documentos: list[DistDfeDocumento] = field(default_factory=list)
    resposta_bruta: str = ""


def _texto(elem: ET.Element | None) -> str:
    return (elem.text or "").strip() if elem is not None else ""


def _local(tag: str) -> str:
    return tag.split("}")[-1] if "}" in tag else tag


def _buscar_filho_por_nome(pai: ET.Element, nome: str) -> ET.Element | None:
    for filho in pai:
        if _local(filho.tag) == nome:
            return filho
    return None


def _extrair_corpo_ret_dist_dfe(soap_xml: str) -> ET.Element | None:
    try:
        raiz = ET.fromstring(soap_xml)
    except ET.ParseError:
        return None

    for elem in raiz.iter():
        if _local(elem.tag) == "retDistDFeInt":
            return elem
    return None


def _descompactar_doc_zip(conteudo_b64: str) -> str:
    raw = base64.b64decode(conteudo_b64.strip())
    try:
        xml_bytes = gzip.decompress(raw)
    except OSError:
        xml_bytes = raw
    return xml_bytes.decode("utf-8", errors="replace").strip()


def xml_importavel_como_nfe(xml: str) -> bool:
    """Aceita nfeProc ou NFe completa; ignora resNFe (resumo)."""
    texto = (xml or "").strip()
    if not texto:
        return False
    if re.search(r"<(nfeProc|NFe)\b", texto, re.IGNORECASE):
        return True
    return "infNFe" in texto and "resNFe" not in texto[:200]


def _parse_doczip_element(elem: ET.Element) -> DistDfeDocumento | None:
    conteudo = (elem.text or "").strip()
    if not conteudo:
        return None
    try:
        xml = _descompactar_doc_zip(conteudo)
    except Exception:
        return None
    if not xml_importavel_como_nfe(xml):
        return None
    nsu_attr = elem.attrib.get("NSU") or elem.attrib.get("nsu")
    return DistDfeDocumento(
        xml=xml,
        nsu=normalizar_nsu(nsu_attr) if nsu_attr else None,
        schema=elem.attrib.get("schema") or "",
    )


def _extrair_documentos_doczip(ret: ET.Element) -> list[DistDfeDocumento]:
    documentos: list[DistDfeDocumento] = []
    for elem in ret.iter():
        if _local(elem.tag) != "docZip":
            continue
        documento = _parse_doczip_element(elem)
        if documento is not None:
            documentos.append(documento)
    return documentos


def _resultado_sem_ret_dist_dfe(soap_xml: str, ultimo_nsu_consulta: str) -> DistDfeResultado:
    nsu = normalizar_nsu(ultimo_nsu_consulta) or "000000000000000"
    return DistDfeResultado(
        cstat="",
        xmotivo="Resposta SEFAZ sem retDistDFeInt",
        ultimo_nsu=nsu,
        max_nsu=nsu,
        resposta_bruta=soap_xml[:2000],
    )


def parse_resposta_distribuicao_dfe(soap_xml: str, *, ultimo_nsu_consulta: str) -> DistDfeResultado:
    ret = _extrair_corpo_ret_dist_dfe(soap_xml)
    if ret is None:
        return _resultado_sem_ret_dist_dfe(soap_xml, ultimo_nsu_consulta)

    cstat = _texto(_buscar_filho_por_nome(ret, "cStat"))
    xmotivo = _texto(_buscar_filho_por_nome(ret, "xMotivo"))
    ultimo = normalizar_nsu(_texto(_buscar_filho_por_nome(ret, "ultNSU"))) or normalizar_nsu(
        ultimo_nsu_consulta
    )
    maximo = normalizar_nsu(_texto(_buscar_filho_por_nome(ret, "maxNSU"))) or ultimo

    return DistDfeResultado(
        cstat=cstat,
        xmotivo=xmotivo,
        ultimo_nsu=ultimo or "000000000000000",
        max_nsu=maximo or ultimo or "000000000000000",
        documentos=_extrair_documentos_doczip(ret),
        resposta_bruta=soap_xml,
    )
