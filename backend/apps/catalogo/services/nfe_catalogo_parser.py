"""
Leitura de XML de NF-e (layout Portal Fiscal) para pré-visualização de importação no catálogo.
Focado em notas de entrada (fornecedor = emitente da nota).
"""

from __future__ import annotations

import re
import unicodedata
import xml.etree.ElementTree as ET
from decimal import Decimal, InvalidOperation
from typing import Any

from core.choices.produtos import UnidadeMedidaChoices

_SINONIMOS_UNIDADE_COMERCIAL: dict[str, str] = {
    "UNID": UnidadeMedidaChoices.UN,
    "UNIDS": UnidadeMedidaChoices.UN,
    "UND": UnidadeMedidaChoices.UN,
    "UNIT": UnidadeMedidaChoices.UN,
    "UNIDADE": UnidadeMedidaChoices.UN,
    "UNIDADES": UnidadeMedidaChoices.UN,
    "PEC": UnidadeMedidaChoices.PC,
    "PECA": UnidadeMedidaChoices.PC,
    "PECAS": UnidadeMedidaChoices.PC,
    "PCT": UnidadeMedidaChoices.PC,
    "PACOTE": UnidadeMedidaChoices.PC,
    "PACOTES": UnidadeMedidaChoices.PC,
    "CJ": UnidadeMedidaChoices.CJ,
    "CONJ": UnidadeMedidaChoices.CJ,
    "CONJUNTO": UnidadeMedidaChoices.CJ,
    "CONJUNTOS": UnidadeMedidaChoices.CJ,
    "M": UnidadeMedidaChoices.MT,
    "MTR": UnidadeMedidaChoices.MT,
    "METRO": UnidadeMedidaChoices.MT,
    "METROS": UnidadeMedidaChoices.MT,
    "MTS": UnidadeMedidaChoices.MT,
    "MT2": UnidadeMedidaChoices.M2,
    "MT3": UnidadeMedidaChoices.M3,
    "KGS": UnidadeMedidaChoices.KG,
    "KILO": UnidadeMedidaChoices.KG,
    "KILOS": UnidadeMedidaChoices.KG,
    "KILOGRAMA": UnidadeMedidaChoices.KG,
    "KILOGRAMAS": UnidadeMedidaChoices.KG,
    "GR": UnidadeMedidaChoices.G,
    "GRS": UnidadeMedidaChoices.G,
    "GRAMA": UnidadeMedidaChoices.G,
    "GRAMAS": UnidadeMedidaChoices.G,
    "LT": UnidadeMedidaChoices.L,
    "LTR": UnidadeMedidaChoices.L,
    "LTS": UnidadeMedidaChoices.L,
    "LITRO": UnidadeMedidaChoices.L,
    "LITROS": UnidadeMedidaChoices.L,
    "KMS": UnidadeMedidaChoices.KM,
    "QUILOMETRO": UnidadeMedidaChoices.KM,
    "QUILOMETROS": UnidadeMedidaChoices.KM,
}


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


def _attr_nitem(det: ET.Element) -> int:
    raw = det.attrib.get("nItem") or det.attrib.get("nitem") or "0"

    try:
        return int(raw)
    except ValueError:
        return 0


def _somente_digitos(valor: str, max_len: int | None = None) -> str:
    d = re.sub(r"\D", "", valor or "")

    if max_len is not None:
        return d[:max_len]

    return d


def _tipo_documento_emitente(cnpj: str, cpf: str) -> str:
    if len(cnpj) == 14:
        return "CNPJ"

    if len(cpf) == 11:
        return "CPF"

    return ""


def _normalizar_cean(raw: str) -> str:
    t = (raw or "").strip().upper()

    if not t or t in ("SEM GTIN", "SEM GTIN."):
        return ""

    d = _somente_digitos(t)

    return d if 8 <= len(d) <= 14 else ""


def _flatten_xml_group(element: ET.Element | None) -> dict[str, str]:
    if element is None:
        return {}

    return {_local(el.tag): (el.text or "").strip() for el in element}


def _parse_icms_de_bloco(icms_parent: ET.Element | None) -> dict[str, str]:
    if icms_parent is None:
        return {}

    for grp in icms_parent:
        loc = _local(grp.tag)

        if loc.startswith("ICMS"):
            flat = _flatten_xml_group(grp)
            flat["icms_grupo_xml"] = loc
            return flat

    return {}


<<<<<<< HEAD
def _filho_por_tag_local(
    parent: ET.Element | None,
    tag_local: str,
) -> ET.Element | None:
    if parent is None:
        return None

    return next(
        (child for child in parent if _local(child.tag) == tag_local),
        None,
    )


def _flatten_primeiro_grupo_por_prefixo(
    parent: ET.Element,
    prefixos: tuple[str, ...],
) -> dict[str, str]:
    for group in parent:
        if _local(group.tag).startswith(prefixos):
            return _flatten_xml_group(group)

    return {}


def _parse_blocos_imposto(imposto: ET.Element) -> dict[str, dict[str, str]]:
    blocos = {
        "icms": {},
        "pis": {},
        "cofins": {},
        "ipi": {},
    }

    for child in imposto:
        loc = _local(child.tag)

=======
def _filho_por_tag_local(parent: ET.Element, tag_local: str) -> ET.Element | None:
    return next((child for child in parent if _local(child.tag) == tag_local), None)


def _flatten_primeiro_grupo_por_prefixo(
    parent: ET.Element,
    prefixos: tuple[str, ...],
) -> dict[str, str]:
    for group in parent:
        if _local(group.tag).startswith(prefixos):
            return _flatten_xml_group(group)
    return {}


def _parse_blocos_imposto(imposto: ET.Element) -> dict[str, dict[str, str]]:
    blocos = {
        "icms": {},
        "pis": {},
        "cofins": {},
        "ipi": {},
    }
    for child in imposto:
        loc = _local(child.tag)
>>>>>>> origin/dev
        if loc == "ICMS":
            blocos["icms"] = _parse_icms_de_bloco(child)
        elif loc == "PIS":
            blocos["pis"] = _flatten_primeiro_grupo_por_prefixo(child, ("PIS",))
        elif loc == "COFINS":
<<<<<<< HEAD
            blocos["cofins"] = _flatten_primeiro_grupo_por_prefixo(
                child,
                ("COFINS",),
            )
        elif loc == "IPI":
            blocos["ipi"] = _flatten_primeiro_grupo_por_prefixo(
                child,
                ("IPINT", "IPITrib"),
            )

    return blocos

=======
            blocos["cofins"] = _flatten_primeiro_grupo_por_prefixo(child, ("COFINS",))
        elif loc == "IPI":
            blocos["ipi"] = _flatten_primeiro_grupo_por_prefixo(child, ("IPINT", "IPITrib"))
    return blocos

>>>>>>> origin/dev

def _montar_snapshot_imposto(
    *,
    icms_flat: dict[str, str],
    ipi_flat: dict[str, str],
    pis_flat: dict[str, str],
    cofins_flat: dict[str, str],
) -> dict[str, Any]:
    out: dict[str, Any] = {}

    if icms_flat:
        out["icms_grupo_xml"] = icms_flat.get("icms_grupo_xml", "")
        out["orig"] = icms_flat.get("orig", "")
        out["cst_icms"] = icms_flat.get("CST", "")
        out["csosn"] = icms_flat.get("CSOSN", "")
        out["mod_bc_icms"] = icms_flat.get("modBC", "")
        out["v_bc_icms"] = icms_flat.get("vBC") or icms_flat.get("vBCST") or ""
        out["p_icms"] = icms_flat.get("pICMS") or icms_flat.get("pICMSST") or ""
        out["v_icms"] = icms_flat.get("vICMS") or icms_flat.get("vICMSST") or ""

    if ipi_flat:
        out["cst_ipi"] = ipi_flat.get("CST", "")
        out["v_bc_ipi"] = ipi_flat.get("vBC", "")
        out["p_ipi"] = ipi_flat.get("pIPI", "")
        out["v_ipi"] = ipi_flat.get("vIPI", "")

    if pis_flat:
        out["cst_pis"] = pis_flat.get("CST", "")
        out["v_bc_pis"] = pis_flat.get("vBC", "")
        out["p_pis"] = pis_flat.get("pPIS", "")
        out["v_pis"] = pis_flat.get("vPIS", "")

    if cofins_flat:
        out["cst_cofins"] = cofins_flat.get("CST", "")
        out["v_bc_cofins"] = cofins_flat.get("vBC", "")
        out["p_cofins"] = cofins_flat.get("pCOFINS", "")
        out["v_cofins"] = cofins_flat.get("vCOFINS", "")

    return out


def _parse_imposto_de_det(det: ET.Element) -> dict[str, Any]:
    imposto = _filho_por_tag_local(det, "imposto")
<<<<<<< HEAD

=======
>>>>>>> origin/dev
    if imposto is None:
        return {}

    blocos = _parse_blocos_imposto(imposto)
<<<<<<< HEAD

=======
>>>>>>> origin/dev
    return _montar_snapshot_imposto(
        icms_flat=blocos["icms"],
        ipi_flat=blocos["ipi"],
        pis_flat=blocos["pis"],
        cofins_flat=blocos["cofins"],
    )


def _normalizar_token_unidade_comercial(raw: str) -> str:
    """Normaliza texto de uCom/uTrib para comparação com códigos do catálogo."""
    t = unicodedata.normalize("NFKC", (raw or "").strip()).upper()
    t = t.replace("Ç", "C")
    t = re.sub(r"[\s.\-_/]+", "", t)

    return t


def _map_unidade_comercial(ucom: str) -> str:
    """
    Converte ``uCom`` ou ``uTrib`` da NF-e para ``UnidadeMedidaChoices`` do catálogo.

    Primeiro aceita códigos já válidos no ERP. Depois aplica sinônimos comuns em XML
    brasileiro; caso contrário usa UN.
    """
    codigos_catalogo = {c for c, _ in UnidadeMedidaChoices.choices}
    token = _normalizar_token_unidade_comercial(ucom)

    if not token:
        return UnidadeMedidaChoices.UN

    if token in codigos_catalogo:
        return token

    return _SINONIMOS_UNIDADE_COMERCIAL.get(token, UnidadeMedidaChoices.UN)


def _validar_conteudo_xml(content: bytes) -> None:
    if not content or len(content) > 6 * 1024 * 1024:
        raise ValueError(
            "Arquivo XML inválido ou excede o tamanho máximo permitido (6 MB)."
        )


def _parse_xml_root(content: bytes) -> ET.Element:
    _validar_conteudo_xml(content)

    try:
        return ET.fromstring(content)
    except ET.ParseError as exc:
        raise ValueError("XML malformado.") from exc


def _buscar_inf_nfe(root: ET.Element) -> ET.Element:
    for el in root.iter():
        if _local(el.tag) == "infNFe":
            return el

    raise ValueError(
        "Não foi encontrado infNFe no XML (nota fiscal eletrônica inválida?)."
    )


def _extrair_chave_nfe(inf_nfe: ET.Element) -> str:
    id_attr = inf_nfe.attrib.get("Id", "")

    if id_attr.upper().startswith("NFE"):
        return id_attr[3:]

    return id_attr


def _buscar_grupos_principais(
    inf_nfe: ET.Element,
) -> tuple[ET.Element | None, ET.Element | None]:
    ide = _filho_por_tag_local(inf_nfe, "ide")
    emit = _filho_por_tag_local(inf_nfe, "emit")

    return ide, emit


def _montar_identificacao(
    inf_nfe: ET.Element,
    ide: ET.Element | None,
) -> dict[str, str]:
    return {
        "chave": _extrair_chave_nfe(inf_nfe),
        "numero": _text(ide, "nNF"),
        "serie": _text(ide, "serie"),
        "data_emissao": _text(ide, "dhEmi") or _text(ide, "dEmi"),
    }


def _extrair_documentos_emitente(emit: ET.Element | None) -> tuple[str, str]:
    if emit is None:
        return "", ""

    cnpj = _somente_digitos(_text(emit, "CNPJ"), 14)
    cpf = _somente_digitos(_text(emit, "CPF"), 11)

    return cnpj, cpf


def _montar_emitente(emit: ET.Element | None) -> dict[str, Any]:
    cnpj_emit, cpf_emit = _extrair_documentos_emitente(emit)
    cnpj_norm = cnpj_emit if len(cnpj_emit) == 14 else ""
    cpf_norm = cpf_emit if len(cpf_emit) == 11 else ""
    ender_emit = _filho_por_tag_local(emit, "enderEmit")

    return {
        "cnpj": cnpj_norm,
        "cpf": cpf_norm,
        "documento_original": cnpj_emit or cpf_emit,
        "tipo_documento": _tipo_documento_emitente(cnpj_emit, cpf_emit),
        "cadastro_fornecedor_disponivel": len(cnpj_emit) == 14,
        "razao_social": _text(emit, "xNome"),
        "nome_fantasia": _text(emit, "xFant"),
        "inscricao_estadual": _text(emit, "IE"),
        "logradouro": _text(ender_emit, "xLgr"),
        "numero": _text(ender_emit, "nro"),
        "complemento": _text(ender_emit, "xCpl"),
        "bairro": _text(ender_emit, "xBairro"),
        "municipio": _text(ender_emit, "xMun"),
        "uf": _text(ender_emit, "UF"),
        "cep": _somente_digitos(_text(ender_emit, "CEP"), 8),
    }


def _parse_decimal_xml(valor: str) -> str:
    try:
        return str(Decimal(valor or "0"))
    except (InvalidOperation, ValueError):
        return "0"


def _montar_item_nfe(det: ET.Element, prod: ET.Element) -> dict[str, Any]:
    cprod = _text(prod, "cProd")
    xprod = _text(prod, "xProd")
    ucom = _text(prod, "uCom")
    u_trib_raw = _text(prod, "uTrib")

    return {
        "n_item": _attr_nitem(det),
        "c_prod": cprod[:60] if cprod else "",
        "x_prod": xprod[:255] if xprod else "",
        "ncm": _somente_digitos(_text(prod, "NCM"), 8),
        "cest": _somente_digitos(_text(prod, "CEST"), 7),
        "c_ean": _normalizar_cean(_text(prod, "cEAN")),
        "u_com": ucom,
        "unidade_catalogo": _map_unidade_comercial(ucom),
        "u_trib_catalogo": _map_unidade_comercial(u_trib_raw) if u_trib_raw else "",
        "q_com": _parse_decimal_xml(_text(prod, "qCom")),
        "v_un_com": _parse_decimal_xml(_text(prod, "vUnCom")),
        "cfop": _text(prod, "CFOP"),
        "imposto": _parse_imposto_de_det(det),
    }


def _parse_item_det(det: ET.Element) -> dict[str, Any] | None:
    prod = _filho_por_tag_local(det, "prod")

    if prod is None:
        return None

    return _montar_item_nfe(det, prod)


def _iter_dets(inf_nfe: ET.Element):
    return (
        child
        for child in inf_nfe
        if _local(child.tag) == "det"
    )


def _montar_itens(inf_nfe: ET.Element) -> list[dict[str, Any]]:
    itens = [
        item
        for det in _iter_dets(inf_nfe)
        if (item := _parse_item_det(det)) is not None
    ]

    itens.sort(key=lambda item: item["n_item"])

    return itens


def parse_nfe_xml_bytes(content: bytes) -> dict[str, Any]:
    """
    Extrai identificação da nota, emitente e itens (prod).
    Aceita `nfeProc` ou raiz `NFe`.
    """
    root = _parse_xml_root(content)
    inf_nfe = _buscar_inf_nfe(root)
    ide, emit = _buscar_grupos_principais(inf_nfe)

    return {
        "identificacao": _montar_identificacao(inf_nfe, ide),
        "emitente": _montar_emitente(emit),
        "itens": _montar_itens(inf_nfe),
    }