"""Serviço de importação de NF-e/NFS-e emitida pela ZFW."""
from __future__ import annotations

from typing import Any, TypedDict

from django.db import transaction

from apps.fiscal.choices import (
    ClassificacaoFiscalOrigemChoices,
    ObjetivoSaidaFiscalChoices,
    OrigemImportacaoFiscalChoices,
    TipoDocumentoFiscalEmitidoChoices,
)
from apps.fiscal.models import DocumentoFiscalEmitido, ItemDocumentoFiscalEmitido
from apps.fiscal.services.classificar_documento_emitido import classificar_documento_emitido
from apps.fiscal.services.documento_emitido_parser import (
    DocumentoEmitidoParserError,
    detectar_tipo_documento_emitido,
    parse_nfe_produto_emitida,
    parse_nfse_servico_emitida,
)
from apps.fiscal.services.validar_emitente_documento_emitido import (
    validar_emitente_documento_emitido,
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


def _validar_xml_entrada(xml: str) -> str:
    texto_xml = (xml or "").strip()
    if not texto_xml:
        raise DocumentoEmitidoParserError("XML não informado.")
    if not texto_xml.startswith("<"):
        raise DocumentoEmitidoParserError("Conteúdo não parece ser um arquivo XML válido.")
    return texto_xml


def _atualizar_campos_participantes(existente: DocumentoFiscalEmitido, dados: dict[str, Any]) -> list[str]:
    update_fields: list[str] = []
    emitente = dados.get("emitente") or {}
    destinatario = dados.get("destinatario") or {}
    pares = (
        ("cnpj_emitente", emitente.get("cnpj")),
        ("nome_emitente", (emitente.get("nome") or "")[:255]),
        ("cnpj_destinatario", destinatario.get("cnpj")),
        ("nome_destinatario", (destinatario.get("nome") or "")[:255]),
    )
    for campo, valor in pares:
        if valor and not getattr(existente, campo):
            setattr(existente, campo, valor)
            update_fields.append(campo)
    return update_fields


def _importar_documento_existente(
    existente: DocumentoFiscalEmitido,
    dados: dict[str, Any],
    *,
    classificar_automaticamente: bool,
) -> ResultadoImportacaoDocumentoEmitido:
    update_fields = _atualizar_campos_participantes(existente, dados)
    if update_fields:
        existente.save(update_fields=[*update_fields, "atualizada_em"])
    if classificar_automaticamente:
        classificar_documento_emitido(existente, forcar=True)
    return {
        "created": False,
        "documento": existente,
        "message": "Documento fiscal emitido já cadastrado.",
    }


def _classificacao_inicial(
    objetivo_saida: str | None,
    classificar_automaticamente: bool,
) -> tuple[str, str]:
    manual = bool(objetivo_saida and not classificar_automaticamente)
    objetivo = objetivo_saida if manual else ObjetivoSaidaFiscalChoices.OUTRAS_SAIDAS
    origem = (
        ClassificacaoFiscalOrigemChoices.MANUAL
        if manual
        else ClassificacaoFiscalOrigemChoices.AUTOMATICA
    )
    return objetivo, origem


def _criar_itens_documento(documento: DocumentoFiscalEmitido, itens: list[dict[str, Any]]) -> None:
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
            for item in itens
        ]
    )


def _criar_documento_emitido(
    *,
    dados: dict[str, Any],
    tipo: str,
    texto_xml: str,
    objetivo_inicial: str,
    origem_classificacao: str,
    origem_importacao: str,
) -> DocumentoFiscalEmitido:
    with transaction.atomic():
        documento = DocumentoFiscalEmitido.objects.create(
            identificador=dados["identificador"],
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
            xml_original=texto_xml,
        )
        _criar_itens_documento(documento, dados.get("itens", []))
    return documento


def _aplicar_classificacao_pos_criacao(
    documento: DocumentoFiscalEmitido,
    *,
    classificar_automaticamente: bool,
    objetivo_saida: str | None,
) -> None:
    if classificar_automaticamente:
        classificar_documento_emitido(documento, forcar=True)
        return
    if objetivo_saida:
        documento.objetivo_saida = objetivo_saida
        documento.save(update_fields=["objetivo_saida", "atualizada_em"])


def importar_xml_documento_emitido(
    *,
    xml: str,
    tipo_documento: str | None = None,
    objetivo_saida: str | None = None,
    origem_importacao: str = OrigemImportacaoFiscalChoices.MANUAL,
    classificar_automaticamente: bool = True,
) -> ResultadoImportacaoDocumentoEmitido:
    """Importa XML emitido pela ZFW e evita duplicidade pelo identificador fiscal."""
    texto_xml = _validar_xml_entrada(xml)
    tipo = tipo_documento or detectar_tipo_documento_emitido(texto_xml)
    dados = _parse_por_tipo(tipo, texto_xml)
    validar_emitente_documento_emitido(dados.get("emitente") or {})

    existente = DocumentoFiscalEmitido.objects.filter(identificador=dados["identificador"]).first()
    if existente is not None:
        return _importar_documento_existente(
            existente,
            dados,
            classificar_automaticamente=classificar_automaticamente,
        )

    objetivo_inicial, origem_classificacao = _classificacao_inicial(
        objetivo_saida,
        classificar_automaticamente,
    )
    documento = _criar_documento_emitido(
        dados=dados,
        tipo=tipo,
        texto_xml=texto_xml,
        objetivo_inicial=objetivo_inicial,
        origem_classificacao=origem_classificacao,
        origem_importacao=origem_importacao,
    )
    _aplicar_classificacao_pos_criacao(
        documento,
        classificar_automaticamente=classificar_automaticamente,
        objetivo_saida=objetivo_saida,
    )

    return {
        "created": True,
        "documento": documento,
        "message": "Documento fiscal emitido importado com sucesso.",
    }
