"""
Parser de XML de NF-e para importação fiscal (documentos recebidos).
Independente do banco de dados; aceita raiz nfeProc ou NFe.
"""
from __future__ import annotations

import re
import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from django.utils.dateparse import parse_datetime

from apps.fiscal.utils import normalizar_cnpj, somente_digitos


class NFeParserError(ValueError):
    """Erro de validação ou estrutura do XML da NF-e."""


def _local(tag: str) -> str:
    if not tag:
        return ""
    return tag.split("}", 1)[-1]


def _text(parent: ET.Element | None, tag_local: str) -> str:
    if parent is None:
        return ""
    for child in parent:
        if _local(child.tag) == tag_local:
            return (child.text or "").strip()
    return ""


def _filho_por_tag_local(parent: ET.Element, tag_local: str) -> ET.Element | None:
    return next((child for child in parent if _local(child.tag) == tag_local), None)


def _parse_xml_root(xml: str) -> ET.Element:
    texto = (xml or "").strip()
    if not texto:
        raise NFeParserError("XML não informado.")
    try:
        return ET.fromstring(texto)
    except ET.ParseError as exc:
        raise NFeParserError("XML malformado ou inválido.") from exc


def _buscar_inf_nfe(root: ET.Element) -> ET.Element:
    for el in root.iter():
        if _local(el.tag) == "infNFe":
            return el
    raise NFeParserError(
        "Não foi encontrado infNFe no XML (nota fiscal eletrônica inválida?)."
    )


def _extrair_chave_acesso(inf_nfe: ET.Element) -> str:
    id_attr = (inf_nfe.attrib.get("Id") or "").strip()
    if id_attr.upper().startswith("NFE"):
        chave = id_attr[3:]
    else:
        chave = id_attr
    chave = somente_digitos(chave, 44)
    if len(chave) != 44:
        raise NFeParserError("Chave de acesso da NF-e não encontrada ou inválida (44 dígitos).")
    return chave


def _parse_decimal(valor: str, default: str = "0") -> Decimal:
    try:
        return Decimal((valor or "").strip() or default)
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _parse_data_emissao(ide: ET.Element | None) -> datetime | None:
    if ide is None:
        return None
    raw = _text(ide, "dhEmi") or _text(ide, "dEmi")
    if not raw:
        return None
    parsed = parse_datetime(raw)
    if parsed is not None:
        return parsed
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(raw[:19], fmt)
        except ValueError:
            continue
    return None


def _extrair_participante(grupo: ET.Element | None) -> dict[str, str]:
    if grupo is None:
        return {"cnpj": "", "nome": ""}
    cnpj = normalizar_cnpj(_text(grupo, "CNPJ"))
    if not cnpj:
        cnpj = somente_digitos(_text(grupo, "CPF"), 11)
    return {
        "cnpj": cnpj,
        "nome": _text(grupo, "xNome"),
    }


def _attr_nitem(det: ET.Element) -> int:
    raw = det.attrib.get("nItem") or det.attrib.get("nitem") or "0"
    try:
        return max(1, int(raw))
    except ValueError:
        return 1


def _extrair_valor_total(inf_nfe: ET.Element) -> Decimal:
    total = _filho_por_tag_local(inf_nfe, "total")
    icms_tot = _filho_por_tag_local(total, "ICMSTot") if total is not None else None
    return _parse_decimal(_text(icms_tot, "vNF"))


def _iter_dets(inf_nfe: ET.Element):
    return (child for child in inf_nfe if _local(child.tag) == "det")


def _parse_item_det(det: ET.Element) -> dict[str, Any] | None:
    prod = _filho_por_tag_local(det, "prod")
    if prod is None:
        return None
    return {
        "numero_item": _attr_nitem(det),
        "codigo_fornecedor": _text(prod, "cProd")[:100],
        "gtin": _normalizar_gtin(_text(prod, "cEAN") or _text(prod, "cEANTrib")),
        "descricao": _text(prod, "xProd")[:500],
        "ncm": _text(prod, "NCM")[:20],
        "cfop": _text(prod, "CFOP")[:10],
        "unidade": _text(prod, "uCom")[:20],
        "quantidade": _parse_decimal(_text(prod, "qCom"), "0"),
        "valor_unitario": _parse_decimal(_text(prod, "vUnCom"), "0"),
        "valor_total": _parse_decimal(_text(prod, "vProd"), "0"),
    }


def _normalizar_gtin(valor: str) -> str:
    """Retorna apenas o GTIN numérico válido; descarta 'SEM GTIN' e afins."""
    digitos = somente_digitos(valor or "", 14)
    if len(digitos) in (8, 12, 13, 14):
        return digitos
    return ""


def _montar_itens(inf_nfe: ET.Element) -> list[dict[str, Any]]:
    itens = [item for det in _iter_dets(inf_nfe) if (item := _parse_item_det(det))]
    itens.sort(key=lambda row: row["numero_item"])
    return itens


def parse_nfe_xml(xml: str) -> dict[str, Any]:
    """
    Extrai dados principais da NF-e a partir do XML (string).
    Retorna dict conforme contrato do módulo fiscal.
    """
    root = _parse_xml_root(xml)
    inf_nfe = _buscar_inf_nfe(root)
    ide = _filho_por_tag_local(inf_nfe, "ide")
    emit = _filho_por_tag_local(inf_nfe, "emit")
    dest = _filho_por_tag_local(inf_nfe, "dest")

    chave_acesso = _extrair_chave_acesso(inf_nfe)
    emitente = _extrair_participante(emit)
    destinatario = _extrair_participante(dest)

    if not emitente.get("cnpj"):
        raise NFeParserError("Emitente (CNPJ/CPF) não encontrado no XML.")
    if not destinatario.get("cnpj"):
        raise NFeParserError("Destinatário (CNPJ/CPF) não encontrado no XML.")

    return {
        "chave_acesso": chave_acesso,
        "numero": _text(ide, "nNF")[:20],
        "serie": _text(ide, "serie")[:10],
        "data_emissao": _parse_data_emissao(ide),
        "natureza_operacao": (_text(ide, "natOp") or "")[:255],
        "finalidade_nfe": _text(ide, "finNFe")[:2],
        "valor_total": _extrair_valor_total(inf_nfe),
        "emitente": emitente,
        "destinatario": destinatario,
        "itens": _montar_itens(inf_nfe),
    }
