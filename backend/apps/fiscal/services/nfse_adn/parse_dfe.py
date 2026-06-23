"""Parser da resposta JSON da distribuição DFe ADN."""
from __future__ import annotations

import base64
import gzip
from dataclasses import dataclass, field


@dataclass
class AdnDfeDocumento:
    nsu: str
    tipo_documento: str
    chave_acesso: str
    xml: str
    tipo_evento: str = ""


@dataclass
class AdnDfeResultado:
    status_processamento: str
    ultimo_nsu: str
    max_nsu: str
    motivo: str = ""
    documentos: list[AdnDfeDocumento] = field(default_factory=list)


def _descompactar_xml(conteudo_b64: str) -> str:
    raw = base64.b64decode(conteudo_b64.strip())
    try:
        xml_bytes = gzip.decompress(raw)
    except OSError:
        xml_bytes = raw
    return xml_bytes.decode("utf-8", errors="replace").strip()


def _texto(valor) -> str:
    return str(valor or "").strip()


def _extrair_itens_lote(payload: dict) -> list:
    for chave in ("LoteDFe", "loteDFe", "Documentos", "documentos", "ListaDocumentos"):
        valor = payload.get(chave)
        if isinstance(valor, list):
            return valor
    return []


def _parse_item(item: dict) -> AdnDfeDocumento | None:
    nsu = _texto(item.get("NSU") or item.get("nsu"))
    tipo = _texto(item.get("TipoDocumento") or item.get("tipoDocumento") or item.get("TipoDFe"))
    chave = _texto(item.get("ChaveAcesso") or item.get("chaveAcesso"))
    tipo_evento = _texto(item.get("TipoEvento") or item.get("tipoEvento"))
    arquivo = _texto(
        item.get("ArquivoXml")
        or item.get("arquivoXml")
        or item.get("ArquivoXmlGZipB64")
        or item.get("arquivoXmlGZipB64")
        or item.get("nfseXmlGZipB64")
    )
    if not arquivo:
        return None
    try:
        xml = _descompactar_xml(arquivo)
    except Exception:
        return None
    if not xml:
        return None
    return AdnDfeDocumento(
        nsu=nsu,
        tipo_documento=tipo,
        chave_acesso=chave,
        xml=xml,
        tipo_evento=tipo_evento,
    )


def parse_resposta_distribuicao_dfe(payload: dict | list, *, ultimo_nsu_consulta: str) -> AdnDfeResultado:
    if isinstance(payload, list):
        payload = {"LoteDFe": payload}

    status = _texto(
        payload.get("StatusProcessamento")
        or payload.get("statusProcessamento")
        or payload.get("status")
    )
    ultimo = _texto(payload.get("UltimoNSU") or payload.get("ultimoNSU") or payload.get("ultNSU"))
    maximo = _texto(payload.get("MaximoNSU") or payload.get("maximoNSU") or payload.get("maxNSU"))
    motivo = _texto(payload.get("Motivo") or payload.get("motivo") or payload.get("xMotivo"))

    documentos: list[AdnDfeDocumento] = []
    for item in _extrair_itens_lote(payload):
        if not isinstance(item, dict):
            continue
        doc = _parse_item(item)
        if doc is not None:
            documentos.append(doc)

    if not ultimo and documentos:
        ultimo = documentos[-1].nsu
    if not ultimo:
        ultimo = ultimo_nsu_consulta
    if not maximo:
        maximo = ultimo

    return AdnDfeResultado(
        status_processamento=status,
        ultimo_nsu=ultimo,
        max_nsu=maximo,
        motivo=motivo,
        documentos=documentos,
    )
