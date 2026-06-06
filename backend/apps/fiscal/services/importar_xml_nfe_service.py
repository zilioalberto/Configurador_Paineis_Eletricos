"""
Serviço de importação de XML de NF-e recebida (armazenamento central no servidor).
"""
from __future__ import annotations

from typing import Any, TypedDict

from django.db import transaction

from apps.fiscal.choices import OrigemImportacaoFiscalChoices, StatusImportacaoFiscalChoices
from apps.fiscal.models import DocumentoFiscalRecebido, ItemDocumentoFiscal
from apps.fiscal.services.nfe_parser import NFeParserError, parse_nfe_xml
from apps.fiscal.utils import normalizar_cnpj, normalizar_nsu


class ResultadoImportacaoNFe(TypedDict):
    created: bool
    documento: DocumentoFiscalRecebido
    message: str


def importar_xml_nfe(
    *,
    xml: str,
    nsu: str | None = None,
    cnpj_destinatario: str | None = None,
    origem_importacao: str = OrigemImportacaoFiscalChoices.MANUAL,
) -> ResultadoImportacaoNFe:
    """
    Importa NF-e a partir do XML. Evita duplicidade pela chave de acesso.
    """
    if not (xml or "").strip():
        raise NFeParserError("XML não informado.")

    dados = parse_nfe_xml(xml)
    chave = dados["chave_acesso"]

    existente = DocumentoFiscalRecebido.objects.filter(chave_acesso=chave).first()
    if existente is not None:
        return {
            "created": False,
            "documento": existente,
            "message": "NF-e já cadastrada.",
        }

    dest = dados["destinatario"]
    cnpj_dest = normalizar_cnpj(cnpj_destinatario) if cnpj_destinatario else dest["cnpj"]
    if cnpj_destinatario and len(cnpj_dest) != 14:
        raise NFeParserError("CNPJ do destinatário deve conter 14 dígitos.")

    nsu_norm = normalizar_nsu(nsu) if nsu else None

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
            status_importacao=StatusImportacaoFiscalChoices.RECEBIDA,
            origem_importacao=origem_importacao,
            xml_original=xml,
        )
        itens_payload: list[dict[str, Any]] = dados.get("itens") or []
        ItemDocumentoFiscal.objects.bulk_create(
            [
                ItemDocumentoFiscal(
                    documento=documento,
                    numero_item=item["numero_item"],
                    codigo_fornecedor=item.get("codigo_fornecedor") or "",
                    descricao=item.get("descricao") or "",
                    ncm=item.get("ncm") or "",
                    cfop=item.get("cfop") or "",
                    unidade=item.get("unidade") or "",
                    quantidade=item["quantidade"],
                    valor_unitario=item["valor_unitario"],
                    valor_total=item["valor_total"],
                )
                for item in itens_payload
            ]
        )

    return {
        "created": True,
        "documento": documento,
        "message": "NF-e importada com sucesso.",
    }
