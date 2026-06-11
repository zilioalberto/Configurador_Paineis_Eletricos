"""Serviço de importação de NF-e/NFS-e emitida pela ZFW."""
from __future__ import annotations

from typing import Any, TypedDict

from django.db import transaction

from apps.fiscal.choices import (
    ObjetivoSaidaFiscalChoices,
    OrigemImportacaoFiscalChoices,
    TipoDocumentoFiscalEmitidoChoices,
)
from apps.fiscal.models import DocumentoFiscalEmitido, ItemDocumentoFiscalEmitido
from apps.fiscal.choices import ClassificacaoFiscalOrigemChoices
from apps.fiscal.services.classificar_documento_emitido import classificar_documento_emitido
from apps.fiscal.services.documento_emitido_parser import (
    DocumentoEmitidoParserError,
    detectar_tipo_documento_emitido,
    parse_nfe_produto_emitida,
    parse_nfse_servico_emitida,
)


class ResultadoImportacaoDocumentoEmitido(TypedDict):
    created: bool
    documento: DocumentoFiscalEmitido
    message: str


def _parse_por_tipo(tipo_documento: str, xml: str) -> dict[str, Any]:
    if tipo_documento == TipoDocumentoFiscalEmitidoChoices.NFE_PRODUTO:
        return parse_nfe_produto_emitida(xml)
    if tipo_documento == TipoDocumentoFiscalEmitidoChoices.NFSE_SERVICO:
        return parse_nfse_servico_emitida(xml)
    raise DocumentoEmitidoParserError("Tipo de documento emitido inválido.")


def importar_xml_documento_emitido(
    *,
    xml: str,
    tipo_documento: str | None = None,
    objetivo_saida: str | None = None,
    origem_importacao: str = OrigemImportacaoFiscalChoices.MANUAL,
    classificar_automaticamente: bool = True,
) -> ResultadoImportacaoDocumentoEmitido:
    """Importa XML emitido pela ZFW e evita duplicidade pelo identificador fiscal."""
    tipo = tipo_documento or detectar_tipo_documento_emitido(xml)
    dados = _parse_por_tipo(tipo, xml)
    identificador = dados["identificador"]
    existente = DocumentoFiscalEmitido.objects.filter(identificador=identificador).first()
    if existente is not None:
        if classificar_automaticamente:
            classificar_documento_emitido(existente, forcar=True)
        return {
            "created": False,
            "documento": existente,
            "message": "Documento fiscal emitido já cadastrado.",
        }

    objetivo_inicial = (
        objetivo_saida
        if objetivo_saida and not classificar_automaticamente
        else ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS
    )
    origem_classificacao = (
        ClassificacaoFiscalOrigemChoices.MANUAL
        if objetivo_saida and not classificar_automaticamente
        else ClassificacaoFiscalOrigemChoices.AUTOMATICA
    )

    with transaction.atomic():
        documento = DocumentoFiscalEmitido.objects.create(
            identificador=identificador,
            tipo_documento=tipo,
            chave_acesso=dados.get("chave_acesso") or "",
            cnpj_emitente=dados["emitente"].get("cnpj") or "",
            nome_emitente=(dados["emitente"].get("nome") or "")[:255],
            cnpj_destinatario=dados["destinatario"].get("cnpj") or "",
            nome_destinatario=(dados["destinatario"].get("nome") or "")[:255],
            numero=dados["numero"],
            serie=dados.get("serie") or "",
            data_emissao=dados.get("data_emissao"),
            valor_total=dados["valor_total"],
            natureza_operacao=dados.get("natureza_operacao") or "",
            objetivo_saida=objetivo_inicial,
            origem_importacao=origem_importacao,
            classificacao_origem=origem_classificacao,
            xml_original=xml,
        )
        ItemDocumentoFiscalEmitido.objects.bulk_create(
            [
                ItemDocumentoFiscalEmitido(
                    documento=documento,
                    numero_item=item["numero_item"],
                    codigo=item.get("codigo") or item.get("codigo_fornecedor") or "",
                    descricao=item.get("descricao") or "",
                    ncm=item.get("ncm") or "",
                    cfop=item.get("cfop") or "",
                    unidade=item.get("unidade") or "",
                    quantidade=item["quantidade"],
                    valor_unitario=item["valor_unitario"],
                    valor_total=item["valor_total"],
                )
                for item in dados.get("itens", [])
            ]
        )

    if classificar_automaticamente:
        classificar_documento_emitido(documento, forcar=True)
    elif objetivo_saida:
        documento.objetivo_saida = objetivo_saida
        documento.save(update_fields=["objetivo_saida", "atualizada_em"])

    return {
        "created": True,
        "documento": documento,
        "message": "Documento fiscal emitido importado com sucesso.",
    }
