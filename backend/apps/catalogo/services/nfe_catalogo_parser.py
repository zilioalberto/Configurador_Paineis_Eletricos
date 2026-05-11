"""
Leitura de XML de NF-e (layout Portal Fiscal) para pré-visualização de importação no catálogo.
Focado em notas de entrada (fornecedor = emitente da nota).
"""

from __future__ import annotations

import re
import unicodedata
import xml.etree.ElementTree as ET
from decimal import Decimal
from typing import Any

from core.choices.produtos import UnidadeMedidaChoices


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


def _parse_imposto_de_det(det: ET.Element) -> dict[str, Any]:
    imposto = None
    for sub in det:
        if _local(sub.tag) == "imposto":
            imposto = sub
            break
    if imposto is None:
        return {}

    icms_flat: dict[str, str] = {}
    pis_flat: dict[str, str] = {}
    cofins_flat: dict[str, str] = {}
    ipi_flat: dict[str, str] = {}

    for ch in imposto:
        loc = _local(ch.tag)
        if loc == "ICMS":
            icms_flat = _parse_icms_de_bloco(ch)
        elif loc == "PIS":
            for pis_grp in ch:
                if _local(pis_grp.tag).startswith("PIS"):
                    pis_flat = _flatten_xml_group(pis_grp)
                    break
        elif loc == "COFINS":
            for cof_grp in ch:
                if _local(cof_grp.tag).startswith("COFINS"):
                    cofins_flat = _flatten_xml_group(cof_grp)
                    break
        elif loc == "IPI":
            for ipi_grp in ch:
                l2 = _local(ipi_grp.tag)
                if l2.startswith("IPINT") or l2.startswith("IPITrib"):
                    ipi_flat = _flatten_xml_group(ipi_grp)
                    break

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


def _normalizar_token_unidade_comercial(raw: str) -> str:
    """Normaliza texto de uCom/uTrib para comparação com códigos do catálogo."""
    t = unicodedata.normalize("NFKC", (raw or "").strip()).upper()
    t = t.replace("Ç", "C")
    t = re.sub(r"[\s.\-_/]+", "", t)
    return t


def _map_unidade_comercial(ucom: str) -> str:
    """
    Converte ``uCom`` (ou uTrib) da NF-e para ``UnidadeMedidaChoices`` do catálogo.

    Primeiro aceita códigos já válidos no ERP (ex.: KG, L, M2). Depois aplica sinónimos
    comuns em XML brasileiro; caso contrário usa UN.
    """
    codigos_catalogo = {c for c, _ in UnidadeMedidaChoices.choices}
    token = _normalizar_token_unidade_comercial(ucom)
    if not token:
        return UnidadeMedidaChoices.UN
    if token in codigos_catalogo:
        return token

    mapping: dict[str, str] = {
        # Unidade
        "UNID": UnidadeMedidaChoices.UN,
        "UNIDS": UnidadeMedidaChoices.UN,
        "UND": UnidadeMedidaChoices.UN,
        "UNIT": UnidadeMedidaChoices.UN,
        "UNIDADE": UnidadeMedidaChoices.UN,
        "UNIDADES": UnidadeMedidaChoices.UN,
        # Peça
        "PEC": UnidadeMedidaChoices.PC,
        "PECA": UnidadeMedidaChoices.PC,
        "PECAS": UnidadeMedidaChoices.PC,
        "PCT": UnidadeMedidaChoices.PC,
        "PACOTE": UnidadeMedidaChoices.PC,
        "PACOTES": UnidadeMedidaChoices.PC,
        # Conjunto
        "CJ": UnidadeMedidaChoices.CJ,
        "CONJ": UnidadeMedidaChoices.CJ,
        "CONJUNTO": UnidadeMedidaChoices.CJ,
        "CONJUNTOS": UnidadeMedidaChoices.CJ,
        # Metro linear
        "M": UnidadeMedidaChoices.MT,
        "MTR": UnidadeMedidaChoices.MT,
        "METRO": UnidadeMedidaChoices.MT,
        "METROS": UnidadeMedidaChoices.MT,
        "MTS": UnidadeMedidaChoices.MT,
        # Quadrado / cubo
        "MT2": UnidadeMedidaChoices.M2,
        "MT3": UnidadeMedidaChoices.M3,
        # Massa
        "KGS": UnidadeMedidaChoices.KG,
        "KILO": UnidadeMedidaChoices.KG,
        "KILOS": UnidadeMedidaChoices.KG,
        "KILOGRAMA": UnidadeMedidaChoices.KG,
        "KILOGRAMAS": UnidadeMedidaChoices.KG,
        "GR": UnidadeMedidaChoices.G,
        "GRS": UnidadeMedidaChoices.G,
        "GRAMA": UnidadeMedidaChoices.G,
        "GRAMAS": UnidadeMedidaChoices.G,
        # Volume
        "LT": UnidadeMedidaChoices.L,
        "LTR": UnidadeMedidaChoices.L,
        "LTS": UnidadeMedidaChoices.L,
        "LITRO": UnidadeMedidaChoices.L,
        "LITROS": UnidadeMedidaChoices.L,
        # Comprimento rodoviário (raro em material elétrico, mas comum na tabela fiscal)
        "KMS": UnidadeMedidaChoices.KM,
        "QUILOMETRO": UnidadeMedidaChoices.KM,
        "QUILOMETROS": UnidadeMedidaChoices.KM,
    }
    return mapping.get(token, UnidadeMedidaChoices.UN)


def parse_nfe_xml_bytes(content: bytes) -> dict[str, Any]:
    """
    Extrai identificação da nota, emitente e itens (prod).
    Aceita `nfeProc` ou raiz `NFe`.
    """
    if not content or len(content) > 6 * 1024 * 1024:
        raise ValueError("Arquivo XML inválido ou excede o tamanho máximo permitido (6 MB).")

    try:
        root = ET.fromstring(content)
    except ET.ParseError as exc:
        raise ValueError("XML malformado.") from exc

    inf_nfe = None
    for el in root.iter():
        if _local(el.tag) == "infNFe":
            inf_nfe = el
            break
    if inf_nfe is None:
        raise ValueError("Não foi encontrado infNFe no XML (nota fiscal eletrónica inválida?).")

    chave = ""
    id_attr = inf_nfe.attrib.get("Id", "")
    if id_attr.upper().startswith("NFE"):
        chave = id_attr[3:]
    else:
        chave = id_attr

    ide = None
    emit = None
    for child in inf_nfe:
        loc = _local(child.tag)
        if loc == "ide":
            ide = child
        elif loc == "emit":
            emit = child

    numero = _text(ide, "nNF")
    serie = _text(ide, "serie")
    dh_emi = _text(ide, "dhEmi") or _text(ide, "dEmi")

    cnpj_emit = ""
    cpf_emit = ""
    ender_emit = None
    if emit is not None:
        for child in emit:
            loc = _local(child.tag)
            if loc == "CNPJ":
                cnpj_emit = _somente_digitos(child.text or "", 14)
            elif loc == "CPF":
                cpf_emit = _somente_digitos(child.text or "", 11)
            elif loc == "enderEmit":
                ender_emit = child

    cnpj_norm = cnpj_emit if len(cnpj_emit) == 14 else ""

    emitente = {
        "cnpj": cnpj_norm,
        "cpf": cpf_emit if len(cpf_emit) == 11 else "",
        "documento_original": cnpj_emit or cpf_emit,
        "tipo_documento": _tipo_documento_emitente(cnpj_emit, cpf_emit),
        "cadastro_fornecedor_disponivel": len(cnpj_emit) == 14,
        "razao_social": _text(emit, "xNome") if emit is not None else "",
        "nome_fantasia": _text(emit, "xFant") if emit is not None else "",
        "inscricao_estadual": _text(emit, "IE") if emit is not None else "",
        "logradouro": _text(ender_emit, "xLgr"),
        "numero": _text(ender_emit, "nro"),
        "complemento": _text(ender_emit, "xCpl"),
        "bairro": _text(ender_emit, "xBairro"),
        "municipio": _text(ender_emit, "xMun"),
        "uf": _text(ender_emit, "UF"),
        "cep": _somente_digitos(_text(ender_emit, "CEP"), 8),
    }

    itens: list[dict[str, Any]] = []
    for child in inf_nfe:
        if _local(child.tag) != "det":
            continue
        n_item = _attr_nitem(child)
        prod = None
        for sub in child:
            if _local(sub.tag) == "prod":
                prod = sub
                break
        if prod is None:
            continue

        cprod = _text(prod, "cProd")
        xprod = _text(prod, "xProd")
        ncm = _somente_digitos(_text(prod, "NCM"), 8)
        cest = _somente_digitos(_text(prod, "CEST"), 7)
        cean = _normalizar_cean(_text(prod, "cEAN"))
        ucom = _text(prod, "uCom")
        u_trib_raw = _text(prod, "uTrib")
        u_trib_catalogo = _map_unidade_comercial(u_trib_raw) if u_trib_raw else ""
        try:
            qcom = str(Decimal(_text(prod, "qCom") or "0"))
        except Exception:
            qcom = "0"
        try:
            vuncom = str(Decimal(_text(prod, "vUnCom") or "0"))
        except Exception:
            vuncom = "0"
        cfop = _text(prod, "CFOP")
        imposto = _parse_imposto_de_det(child)

        itens.append(
            {
                "n_item": n_item,
                "c_prod": cprod[:60] if cprod else "",
                "x_prod": xprod[:255] if xprod else "",
                "ncm": ncm,
                "cest": cest,
                "c_ean": cean,
                "u_com": ucom,
                "unidade_catalogo": _map_unidade_comercial(ucom),
                "u_trib_catalogo": u_trib_catalogo,
                "q_com": qcom,
                "v_un_com": vuncom,
                "cfop": cfop,
                "imposto": imposto,
            }
        )

    itens.sort(key=lambda x: x["n_item"])

    return {
        "identificacao": {
            "chave": chave,
            "numero": numero,
            "serie": serie,
            "data_emissao": dh_emi,
        },
        "emitente": emitente,
        "itens": itens,
    }
