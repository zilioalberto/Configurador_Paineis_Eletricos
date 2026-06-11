"""Parsers de XML emitido pela ZFW: NF-e de produto e NFS-e de serviço."""
from __future__ import annotations

import xml.etree.ElementTree as ET
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from django.utils.dateparse import parse_datetime

from apps.fiscal.services.nfe_parser import NFeParserError, parse_nfe_xml
from apps.fiscal.utils import normalizar_cnpj, somente_digitos


class DocumentoEmitidoParserError(ValueError):
    """Erro de validação ou estrutura do XML emitido."""


def detectar_tipo_documento_emitido(xml: str) -> str:
    """Infere NF-e de produto ou NFS-e a partir do conteúdo do XML."""
    from apps.fiscal.choices import TipoDocumentoFiscalEmitidoChoices

    texto = (xml or "").strip().lower()
    if not texto:
        raise DocumentoEmitidoParserError("XML não informado.")
    if "compnfse" in texto or "<nfse" in texto or "nfse:" in texto:
        return TipoDocumentoFiscalEmitidoChoices.NFSE_SERVICO
    if "nfeproc" in texto or "<nfe" in texto or "portalfiscal.inf.br/nfe" in texto:
        return TipoDocumentoFiscalEmitidoChoices.NFE_PRODUTO
    raise DocumentoEmitidoParserError(
        "Não foi possível identificar o tipo do XML (NF-e ou NFS-e)."
    )


def _local(tag: str) -> str:
    return tag.split("}", 1)[-1] if tag else ""


def _parse_root(xml: str) -> ET.Element:
    texto = (xml or "").strip()
    if not texto:
        raise DocumentoEmitidoParserError("XML não informado.")
    try:
        return ET.fromstring(texto)
    except ET.ParseError as exc:
        raise DocumentoEmitidoParserError("XML malformado ou inválido.") from exc


def _text_first(root: ET.Element, nomes: tuple[str, ...]) -> str:
    for el in root.iter():
        if _local(el.tag) in nomes and (el.text or "").strip():
            return (el.text or "").strip()
    return ""


def _parse_decimal(valor: str, default: str = "0") -> Decimal:
    try:
        return Decimal((valor or "").strip().replace(",", ".") or default)
    except (InvalidOperation, ValueError):
        return Decimal(default)


def _parse_data(valor: str) -> datetime | None:
    raw = (valor or "").strip()
    if not raw:
        return None
    parsed = parse_datetime(raw)
    if parsed is not None:
        return parsed
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%S", "%d/%m/%Y"):
        try:
            return datetime.strptime(raw[:19], fmt)
        except ValueError:
            continue
    return None


def _participante_nomes(root: ET.Element, grupo_nomes: tuple[str, ...]) -> dict[str, str]:
    for grupo in root.iter():
        if _local(grupo.tag) not in grupo_nomes:
            continue
        cnpj = normalizar_cnpj(_text_first(grupo, ("Cnpj", "CNPJ")))
        if not cnpj:
            cnpj = somente_digitos(_text_first(grupo, ("Cpf", "CPF")), 11)
        return {
            "cnpj": cnpj,
            "nome": _text_first(grupo, ("RazaoSocial", "Nome", "xNome")),
        }
    return {"cnpj": "", "nome": ""}


def parse_nfe_produto_emitida(xml: str) -> dict[str, Any]:
    try:
        dados = parse_nfe_xml(xml)
    except NFeParserError as exc:
        raise DocumentoEmitidoParserError(str(exc)) from exc
    return {
        "identificador": dados["chave_acesso"],
        "chave_acesso": dados["chave_acesso"],
        "numero": dados["numero"],
        "serie": dados["serie"],
        "data_emissao": dados.get("data_emissao"),
        "natureza_operacao": dados.get("natureza_operacao") or "",
        "valor_total": dados["valor_total"],
        "emitente": dados["emitente"],
        "destinatario": dados["destinatario"],
        "itens": dados.get("itens") or [],
    }


def parse_nfse_servico_emitida(xml: str) -> dict[str, Any]:
    root = _parse_root(xml)
    numero = _text_first(root, ("Numero", "NumeroNfse", "nNFSe"))[:20]
    codigo_verificacao = _text_first(root, ("CodigoVerificacao", "CodVerificacao"))[:60]
    prestador = _participante_nomes(root, ("Prestador", "IdentificacaoPrestador", "DadosPrestador"))
    tomador = _participante_nomes(root, ("Tomador", "IdentificacaoTomador", "DadosTomador"))
    valor_total = _parse_decimal(
        _text_first(root, ("ValorServicos", "ValorServico", "ValorTotalServicos", "ValorLiquidoNfse"))
    )
    descricao = _text_first(root, ("Discriminacao", "Descricao", "DescricaoServico"))[:500]
    data = _parse_data(_text_first(root, ("DataEmissao", "Competencia")))

    if not numero:
        raise DocumentoEmitidoParserError("Número da NFS-e não encontrado no XML.")
    if not prestador.get("cnpj"):
        raise DocumentoEmitidoParserError("Prestador da NFS-e não encontrado no XML.")

    identificador = f"NFSE:{prestador['cnpj']}:{numero}:{codigo_verificacao or 'SEM-CODIGO'}"
    return {
        "identificador": identificador,
        "chave_acesso": "",
        "numero": numero,
        "serie": "",
        "data_emissao": data,
        "natureza_operacao": "Prestação de serviço",
        "valor_total": valor_total,
        "emitente": prestador,
        "destinatario": tomador,
        "itens": [
            {
                "numero_item": 1,
                "codigo": "",
                "descricao": descricao or "Serviço prestado",
                "ncm": "",
                "cfop": "",
                "unidade": "SERV",
                "quantidade": Decimal("1"),
                "valor_unitario": valor_total,
                "valor_total": valor_total,
            }
        ],
    }
