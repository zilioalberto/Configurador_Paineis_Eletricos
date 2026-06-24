"""
Serviço de importação de XML de NF-e recebida (armazenamento central no servidor).
"""
from __future__ import annotations

from typing import Any, TypedDict

from django.db import transaction

from apps.fiscal.choices import (
    ClassificacaoFiscalOrigemChoices,
    ObjetivoEntradaFiscalChoices,
    OrigemImportacaoFiscalChoices,
    StatusImportacaoFiscalChoices,
)
from apps.fiscal.models import DocumentoFiscalRecebido, ItemDocumentoFiscal
from apps.fiscal.services.cfop_classificacao_entrada import (
    classificar_cfop_entrada,
    cfop_predominante_por_itens,
)
from apps.fiscal.services.nfe_parser import NFeParserError, parse_nfe_xml
from apps.fiscal.services.validar_destinatario_nfe_recebida import (
    validar_destinatario_nfe_recebida,
)
from apps.fiscal.utils import normalizar_cnpj, normalizar_nsu


class ResultadoImportacaoNFe(TypedDict):
    created: bool
    documento: DocumentoFiscalRecebido
    message: str


def _validar_xml_nfe(xml: str) -> None:
    if not (xml or "").strip():
        raise NFeParserError("XML não informado.")
    if not xml.strip().startswith("<"):
        raise NFeParserError("Conteúdo não parece ser um arquivo XML válido.")


def _resolver_cnpj_destinatario(cnpj_destinatario: str | None, dest: dict) -> str:
    if not cnpj_destinatario:
        return dest["cnpj"]
    cnpj_dest = normalizar_cnpj(cnpj_destinatario)
    if len(cnpj_dest) != 14:
        raise NFeParserError("CNPJ do destinatário deve conter 14 dígitos.")
    return cnpj_dest


def _definir_objetivo_nota(objetivo_entrada: str | None, cfop_predominante: str) -> tuple[str, str]:
    if objetivo_entrada:
        return objetivo_entrada, ClassificacaoFiscalOrigemChoices.MANUAL
    if cfop_predominante:
        objetivo = classificar_cfop_entrada(cfop_predominante).objetivo_entrada
    else:
        objetivo = ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS
    return objetivo, ClassificacaoFiscalOrigemChoices.AUTOMATICA


def _montar_item_documento(documento: DocumentoFiscalRecebido, item: dict) -> ItemDocumentoFiscal:
    return ItemDocumentoFiscal(
        documento=documento,
        numero_item=item["numero_item"],
        codigo_fornecedor=item.get("codigo_fornecedor") or "",
        gtin=item.get("gtin") or "",
        descricao=item.get("descricao") or "",
        ncm=item.get("ncm") or "",
        cfop=item.get("cfop") or "",
        unidade=item.get("unidade") or "",
        quantidade=item["quantidade"],
        valor_unitario=item["valor_unitario"],
        valor_total=item["valor_total"],
        objetivo_entrada=classificar_cfop_entrada(item.get("cfop") or "").objetivo_entrada,
        classificacao_origem=ClassificacaoFiscalOrigemChoices.AUTOMATICA,
    )


def importar_xml_nfe(
    *,
    xml: str,
    nsu: str | None = None,
    cnpj_destinatario: str | None = None,
    origem_importacao: str = OrigemImportacaoFiscalChoices.MANUAL,
    objetivo_entrada: str | None = None,
) -> ResultadoImportacaoNFe:
    """
    Importa NF-e a partir do XML. Evita duplicidade pela chave de acesso.

    Quando ``objetivo_entrada`` não é informado, a destinação da nota e de cada
    item é classificada automaticamente pelo CFOP (revisão manual posterior).
    Quando informado, vale como classificação manual da nota.
    """
    _validar_xml_nfe(xml)

    dados = parse_nfe_xml(xml)
    if origem_importacao != OrigemImportacaoFiscalChoices.SEFAZ_SYNC:
        validar_destinatario_nfe_recebida(dados["destinatario"])
    chave = dados["chave_acesso"]

    existente = DocumentoFiscalRecebido.objects.filter(chave_acesso=chave).first()
    if existente is not None:
        return {
            "created": False,
            "documento": existente,
            "message": "NF-e já cadastrada.",
        }

    dest = dados["destinatario"]
    cnpj_dest = _resolver_cnpj_destinatario(cnpj_destinatario, dest)
    nsu_norm = normalizar_nsu(nsu) if nsu else None
    itens_payload: list[dict[str, Any]] = dados.get("itens") or []

    cfop_predominante = cfop_predominante_por_itens(itens_payload)
    objetivo_nota, classificacao_origem = _definir_objetivo_nota(
        objetivo_entrada, cfop_predominante
    )

    with transaction.atomic():
        documento = DocumentoFiscalRecebido.objects.create(
            chave_acesso=chave,
            nsu=nsu_norm,
            cnpj_emitente=dados["emitente"]["cnpj"],
            nome_emitente=(dados["emitente"].get("nome") or "")[:255],
            cnpj_destinatario=cnpj_dest,
            nome_destinatario=(dest.get("nome") or "")[:255],
            numero=dados["numero"],
            serie=dados["serie"],
            data_emissao=dados.get("data_emissao"),
            valor_total=dados["valor_total"],
            natureza_operacao=dados.get("natureza_operacao") or "",
            finalidade_nfe=dados.get("finalidade_nfe") or "",
            cfop_predominante=cfop_predominante,
            classificacao_origem=classificacao_origem,
            status_importacao=StatusImportacaoFiscalChoices.RECEBIDA,
            origem_importacao=origem_importacao,
            objetivo_entrada=objetivo_nota or ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
            xml_original=xml,
        )
        ItemDocumentoFiscal.objects.bulk_create(
            [_montar_item_documento(documento, item) for item in itens_payload]
        )

    return {
        "created": True,
        "documento": documento,
        "message": "NF-e importada com sucesso.",
    }
