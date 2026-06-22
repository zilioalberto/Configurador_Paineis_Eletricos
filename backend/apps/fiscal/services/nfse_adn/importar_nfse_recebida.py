"""Importação de NFS-e recebida (ADN ou manual)."""
from __future__ import annotations

from typing import TypedDict

from django.conf import settings
from django.db import transaction

from apps.fiscal.choices import (
    ObjetivoEntradaFiscalChoices,
    OrigemImportacaoFiscalChoices,
    StatusImportacaoFiscalChoices,
)
from apps.fiscal.models import DocumentoNfseRecebido, ItemDocumentoNfseRecebido
from apps.fiscal.utils import normalizar_cnpj, normalizar_nsu

from .parse_nfse_recebida import NfseRecebidaParserError, parse_nfse_recebida, validar_tomador_nfse_recebida


class ResultadoImportacaoNfseRecebida(TypedDict):
    created: bool
    documento: DocumentoNfseRecebido
    message: str


def _cnpj_empresa() -> str:
    raw = getattr(settings, "FISCAL_EMPRESA_CNPJ", "") or ""
    return normalizar_cnpj(raw)


def importar_xml_nfse_recebida(
    *,
    xml: str,
    nsu_adn: str | None = None,
    chave_acesso: str | None = None,
    origem_importacao: str = OrigemImportacaoFiscalChoices.MANUAL,
    objetivo_entrada: str = ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
) -> ResultadoImportacaoNfseRecebida:
    if not (xml or "").strip():
        raise NfseRecebidaParserError("XML não informado.")

    dados = parse_nfse_recebida(xml)
    if chave_acesso:
        dados["chave_acesso"] = chave_acesso.strip()
        dados["identificador"] = f"NFSE-NAC:{dados['chave_acesso']}"

    cnpj_empresa = _cnpj_empresa()
    if origem_importacao != OrigemImportacaoFiscalChoices.ADN_SYNC:
        validar_tomador_nfse_recebida(
            {"cnpj": dados["cnpj_tomador"], "nome": dados["nome_tomador"]},
            cnpj_empresa=cnpj_empresa,
        )
    elif cnpj_empresa and dados["cnpj_tomador"] and dados["cnpj_tomador"] != cnpj_empresa:
        raise NfseRecebidaParserError("NFS-e ADN com tomador divergente do CNPJ configurado.")

    identificador = dados["identificador"]
    existente = DocumentoNfseRecebido.objects.filter(identificador=identificador).first()
    if existente is not None:
        return {
            "created": False,
            "documento": existente,
            "message": "NFS-e já cadastrada.",
        }

    nsu_norm = normalizar_nsu(nsu_adn) if nsu_adn else None

    with transaction.atomic():
        documento = DocumentoNfseRecebido.objects.create(
            identificador=identificador,
            chave_acesso=(dados.get("chave_acesso") or "")[:50],
            nsu_adn=nsu_norm,
            cnpj_prestador=dados["cnpj_prestador"],
            nome_prestador=(dados.get("nome_prestador") or "")[:255],
            cnpj_tomador=dados["cnpj_tomador"] or cnpj_empresa,
            nome_tomador=(dados.get("nome_tomador") or "")[:255],
            numero=dados["numero"],
            codigo_verificacao=(dados.get("codigo_verificacao") or "")[:60],
            data_emissao=dados.get("data_emissao"),
            valor_total=dados["valor_total"],
            descricao_servico=(dados.get("descricao_servico") or "")[:500],
            status_importacao=StatusImportacaoFiscalChoices.RECEBIDA,
            origem_importacao=origem_importacao,
            objetivo_entrada=objetivo_entrada or ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
            xml_original=xml,
        )
        for item in dados.get("itens") or []:
            ItemDocumentoNfseRecebido.objects.create(
                documento=documento,
                numero_item=item["numero_item"],
                descricao=item.get("descricao") or "Serviço",
                valor_total=item["valor_total"],
            )

    return {
        "created": True,
        "documento": documento,
        "message": "NFS-e recebida importada com sucesso.",
    }
