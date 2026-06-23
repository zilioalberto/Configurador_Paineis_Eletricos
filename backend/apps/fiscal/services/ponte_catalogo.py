"""Ponte NF-e recebida → catálogo.

Reaproveita o preview/apply do catálogo a partir do XML já armazenado na
``DocumentoFiscalRecebido``, enriquece cada item com matching em cascata e,
após a aplicação, grava a rastreabilidade (``ItemDocumentoFiscal.produto``) e o
de-para fornecedor↔produto.
"""
from __future__ import annotations

from typing import Any

from django.db import transaction

from apps.catalogo.models import Produto
from apps.catalogo.services.nfe_catalogo_apply import AplicarResultado, aplicar_importacao_nfe
from apps.catalogo.services.nfe_catalogo_parser import parse_nfe_xml_bytes
from apps.catalogo.services.nfe_catalogo_preview_enrich import (
    enrich_snapshot_itens_com_produto_existente,
)
from apps.fiscal.choices import ClassificacaoFiscalOrigemChoices
from apps.fiscal.models import (
    DocumentoFiscalRecebido,
    ItemDocumentoFiscal,
    ProdutoFornecedorXRef,
)
from apps.fiscal.services.produto_matching import encontrar_produto
from apps.fiscal.utils import normalizar_cnpj


def _snapshot_da_nfe(documento: DocumentoFiscalRecebido) -> dict[str, Any]:
    xml = documento.xml_original or ""
    if not xml.strip():
        raise ValueError("NF-e sem XML armazenado; não é possível importar para o catálogo.")
    return parse_nfe_xml_bytes(xml.encode("utf-8"))


def _codigo_catalogo(c_prod: str, override: str | None, n_item: int) -> str:
    raw = (override or c_prod or "").strip().replace("\n", " ").replace("\r", "")[:60]
    return raw or f"NFE-{n_item}"


def preview_catalogo_nfe(documento: DocumentoFiscalRecebido) -> dict[str, Any]:
    """Snapshot do catálogo + matching em cascata por item (para a tela de revisão)."""
    snapshot = _snapshot_da_nfe(documento)
    enrich_snapshot_itens_com_produto_existente(snapshot)

    itens_fiscais = {item.numero_item: item for item in documento.itens.all()}
    for snap_item in snapshot.get("itens", []):
        if not isinstance(snap_item, dict):
            continue
        n_item = int(snap_item.get("n_item") or 0)
        fiscal_item = itens_fiscais.get(n_item)
        gtin = (snap_item.get("c_ean") or (fiscal_item.gtin if fiscal_item else "") or "").strip()
        resultado = encontrar_produto(
            cnpj_fornecedor=documento.cnpj_emitente,
            codigo_fornecedor=snap_item.get("c_prod") or "",
            gtin=gtin,
            ncm=snap_item.get("ncm") or "",
            descricao=snap_item.get("x_prod") or "",
        )
        snap_item["match"] = resultado.to_dict()
        snap_item["item_documento_id"] = fiscal_item.id if fiscal_item else None
        snap_item["item_vinculado_produto_id"] = (
            str(fiscal_item.produto_id) if fiscal_item and fiscal_item.produto_id else None
        )

    return {
        "documento_id": documento.id,
        "chave_acesso": documento.chave_acesso,
        "cnpj_emitente": documento.cnpj_emitente,
        "nome_emitente": documento.nome_emitente,
        "objetivo_entrada": documento.objetivo_entrada,
        "snapshot": snapshot,
    }


def _registrar_depara(
    *,
    documento: DocumentoFiscalRecebido,
    fiscal_item: ItemDocumentoFiscal,
    produto: Produto,
) -> None:
    cnpj = normalizar_cnpj(documento.cnpj_emitente)
    codigo = (fiscal_item.codigo_fornecedor or "").strip()
    if len(cnpj) != 14 or not codigo:
        return
    ProdutoFornecedorXRef.objects.update_or_create(
        cnpj_fornecedor=cnpj,
        codigo_fornecedor=codigo,
        defaults={
            "produto": produto,
            "nome_fornecedor": documento.nome_emitente[:255],
            "gtin": (fiscal_item.gtin or "")[:14],
            "descricao_fornecedor": (fiscal_item.descricao or "")[:500],
            "unidade_fornecedor": (fiscal_item.unidade or "")[:20],
            "ncm_fornecedor": (fiscal_item.ncm or "")[:20],
            "origem": ClassificacaoFiscalOrigemChoices.AUTOMATICA,
        },
    )


def _vincular_itens_e_depara(
    documento: DocumentoFiscalRecebido,
    selecao_por_item: dict[int, dict],
) -> int:
    itens_fiscais = {item.numero_item: item for item in documento.itens.all()}
    vinculados = 0
    for n_item, sel in selecao_por_item.items():
        fiscal_item = itens_fiscais.get(n_item)
        if fiscal_item is None:
            continue
        codigo = _codigo_catalogo(
            fiscal_item.codigo_fornecedor,
            sel.get("codigo_catalogo"),
            n_item,
        )
        produto = Produto.objects.filter(codigo=codigo).first()
        if produto is None:
            continue
        fiscal_item.produto = produto
        fiscal_item.importado_para_produto = True
        fiscal_item.save(update_fields=["produto", "importado_para_produto", "atualizado_em"])
        _registrar_depara(documento=documento, fiscal_item=fiscal_item, produto=produto)
        vinculados += 1
    return vinculados


@transaction.atomic
def vincular_item_a_produto(
    fiscal_item: ItemDocumentoFiscal,
    produto: Produto,
    *,
    registrar_depara: bool = True,
    origem_depara: str = ClassificacaoFiscalOrigemChoices.MANUAL,
) -> ItemDocumentoFiscal:
    """Vincula manualmente um item de NF-e a um produto (confirmação de similaridade)."""
    documento = fiscal_item.documento
    fiscal_item.produto = produto
    fiscal_item.importado_para_produto = True
    fiscal_item.save(update_fields=["produto", "importado_para_produto", "atualizado_em"])
    if registrar_depara:
        cnpj = normalizar_cnpj(documento.cnpj_emitente)
        codigo = (fiscal_item.codigo_fornecedor or "").strip()
        if len(cnpj) == 14 and codigo:
            ProdutoFornecedorXRef.objects.update_or_create(
                cnpj_fornecedor=cnpj,
                codigo_fornecedor=codigo,
                defaults={
                    "produto": produto,
                    "nome_fornecedor": documento.nome_emitente[:255],
                    "gtin": (fiscal_item.gtin or "")[:14],
                    "descricao_fornecedor": (fiscal_item.descricao or "")[:500],
                    "unidade_fornecedor": (fiscal_item.unidade or "")[:20],
                    "ncm_fornecedor": (fiscal_item.ncm or "")[:20],
                    "origem": origem_depara,
                },
            )
    return fiscal_item


@transaction.atomic
def importar_nfe_para_catalogo(
    documento: DocumentoFiscalRecebido,
    *,
    criar_fornecedor: bool = False,
    fornecedor_id: str | None = None,
    categoria_padrao: str = "",
    itens: list[dict],
) -> tuple[AplicarResultado, int]:
    """Aplica a importação no catálogo e grava rastreabilidade + de-para."""
    snapshot = _snapshot_da_nfe(documento)
    resultado = aplicar_importacao_nfe(
        snapshot=snapshot,
        criar_fornecedor=criar_fornecedor,
        fornecedor_id=fornecedor_id,
        categoria_padrao=categoria_padrao,
        objetivo_entrada=documento.objetivo_entrada,
        itens=itens,
    )
    selecao_por_item = {int(x["n_item"]): x for x in itens if x.get("importar")}
    vinculados = _vincular_itens_e_depara(documento, selecao_por_item)
    return resultado, vinculados
