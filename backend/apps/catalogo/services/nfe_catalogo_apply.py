from __future__ import annotations

from dataclasses import dataclass
from decimal import ROUND_HALF_UP, Decimal
from typing import Any

from django.db import transaction

from apps.catalogo.models import Produto
from apps.catalogo.services.nfe_catalogo_preview_enrich import (
    produto_diverge_do_xml,
    produto_resumo_para_preview,
)
from apps.fiscal.models import ItemFiscalProduto
from apps.fiscal.services import criar_item_fiscal_importacao_nfe
from apps.cadastros.models import (
    EnderecoParceiro,
    OrigemCadastroParceiroChoices,
    ParceiroComercial,
    TipoPessoaParceiroChoices,
)
from core.choices.fiscal import OrigemMercadoriaICMSChoices
from core.choices.produtos import CategoriaProdutoNomeChoices, UnidadeMedidaChoices


def _codigo_catalogo(snapshot_item: dict, override: str | None) -> str:
    raw = (override or snapshot_item.get("c_prod") or "").strip()
    raw = raw.replace("\n", " ").replace("\r", "")[:60]
    if not raw:
        return f"NFE-{snapshot_item.get('n_item', 0)}"
    return raw


def _decimal_or_zero(s: str) -> Decimal:
    try:
        return Decimal(s or "0")
    except Exception:
        return Decimal("0")


def _regravar_item_fiscal_nfe(prod: Produto, snap: dict[str, Any]) -> None:
    n_item = int(snap.get("n_item") or 0)
    if n_item > 0:
        ItemFiscalProduto.objects.filter(
            produto=prod,
            n_item_nfe=n_item,
        ).delete()
    criar_item_fiscal_importacao_nfe(prod, snap)


@dataclass
class AplicarResultado:
    fornecedor_id: str | None
    fornecedor_criado: bool
    fornecedor_ids: list[str]
    fornecedores_associados: list[dict]
    produtos_criados: list[str]
    produtos_atualizados: list[str]
    produtos_ignorados: list[dict]
    avisos: list[str]


def aplicar_importacao_nfe(
    *,
    snapshot: dict[str, Any],
    criar_fornecedor: bool,
    categoria_padrao: str,
    fabricante_padrao: str,
    itens: list[dict],
    fornecedor_id: str | None = None,
) -> AplicarResultado:
    categorias_validas = {c for c, _ in CategoriaProdutoNomeChoices.choices}
    if categoria_padrao and categoria_padrao not in categorias_validas:
        raise ValueError("Categoria inválida.")

    emit = snapshot.get("emitente") or {}
    cnpj = (emit.get("cnpj") or "").strip()
    avisos: list[str] = []

    if criar_fornecedor and not emit.get("cadastro_fornecedor_disponivel"):
        raise ValueError("Emitente não possui CNPJ válido para cadastro de fornecedor.")
    if criar_fornecedor and len(cnpj) != 14:
        raise ValueError("CNPJ do emitente inválido.")

    by_nitem = {int(x["n_item"]): x for x in snapshot.get("itens", []) if "n_item" in x}
    selecao_por_item = {int(x["n_item"]): x for x in itens if x.get("importar")}
    fornecedor_id_global = str(fornecedor_id) if fornecedor_id else ""
    fornecedor_config_por_item: dict[int, tuple[str, str | None]] = {}

    for n_item, sel in selecao_por_item.items():
        item_fornecedor_id = str(sel.get("fornecedor_id") or "")
        if item_fornecedor_id:
            fornecedor_config_por_item[n_item] = ("existente", item_fornecedor_id)
        elif "criar_fornecedor" in sel:
            fornecedor_config_por_item[n_item] = (
                "emitente" if bool(sel.get("criar_fornecedor")) else "nenhum",
                None,
            )
        elif fornecedor_id_global:
            fornecedor_config_por_item[n_item] = ("existente", fornecedor_id_global)
        elif criar_fornecedor:
            fornecedor_config_por_item[n_item] = ("emitente", None)
        else:
            fornecedor_config_por_item[n_item] = ("nenhum", None)

    usar_emitente = any(tipo == "emitente" for tipo, _ in fornecedor_config_por_item.values())
    fornecedor_ids_existentes = {
        fid for tipo, fid in fornecedor_config_por_item.values() if tipo == "existente" and fid
    }

    for n_item, sel in sorted(selecao_por_item.items()):
        categoria_item = (sel.get("categoria_catalogo") or categoria_padrao or "").strip()
        if not categoria_item:
            raise ValueError(f"Categoria obrigatória para o item {n_item}.")
        if categoria_item not in categorias_validas:
            raise ValueError(f"Categoria inválida para o item {n_item}.")

    fornecedores_existentes = {
        str(fornecedor.id): fornecedor
        for fornecedor in ParceiroComercial.objects.filter(
            id__in=fornecedor_ids_existentes,
            eh_fornecedor=True,
            ativo=True,
        )
    }
    fornecedores_nao_encontrados = fornecedor_ids_existentes - set(fornecedores_existentes)
    if fornecedores_nao_encontrados:
        raise ValueError("Fornecedor selecionado não encontrado.")

    produtos_criados: list[str] = []
    produtos_atualizados: list[str] = []
    ignorados: list[dict] = []
    fornecedor_id: str | None = None
    fornecedor_criado = False
    fornecedor_emitente: ParceiroComercial | None = None
    fornecedores_usados: dict[str, ParceiroComercial] = {}

    fabricante_padrao_limpo = (fabricante_padrao or "").strip()[:100]
    fabricante_emitente = (emit.get("razao_social") or "").strip()[:100]
    fiscal_apenas_alinhados: list[str] = []

    with transaction.atomic():
        if usar_emitente:
            if not emit.get("cadastro_fornecedor_disponivel"):
                raise ValueError("Emitente não possui CNPJ válido para cadastro de fornecedor.")
            if len(cnpj) != 14:
                raise ValueError("CNPJ do emitente inválido.")
            fornecedor_emitente, created = ParceiroComercial.objects.get_or_create(
                documento=cnpj,
                defaults={
                    "tipo_pessoa": TipoPessoaParceiroChoices.PESSOA_JURIDICA,
                    "razao_social": (emit.get("razao_social") or "Fornecedor")[:255],
                    "nome_fantasia": (emit.get("nome_fantasia") or "")[:255],
                    "inscricao_estadual": (emit.get("inscricao_estadual") or "")[:20],
                    "eh_fornecedor": True,
                    "ativo": True,
                    "origem": OrigemCadastroParceiroChoices.NFE,
                },
            )
            if not fornecedor_emitente.eh_fornecedor:
                fornecedor_emitente.eh_fornecedor = True
                fornecedor_emitente.ativo = True
                fornecedor_emitente.save(update_fields=("eh_fornecedor", "ativo", "atualizado_em"))
            EnderecoParceiro.objects.get_or_create(
                parceiro=fornecedor_emitente,
                principal=True,
                defaults={
                    "nome": "Principal",
                    "logradouro": (emit.get("logradouro") or "")[:255],
                    "numero": (emit.get("numero") or "")[:20],
                    "complemento": (emit.get("complemento") or "")[:120],
                    "bairro": (emit.get("bairro") or "")[:120],
                    "municipio": (emit.get("municipio") or "")[:120],
                    "uf": (emit.get("uf") or "")[:2].upper(),
                    "cep": (emit.get("cep") or "")[:8],
                },
            )
            fornecedor_id = str(fornecedor_emitente.id)
            fornecedor_criado = created
        for n_item, sel in sorted(selecao_por_item.items()):
            snap = by_nitem.get(n_item)
            if not snap:
                ignorados.append({"n_item": n_item, "motivo": "Item não encontrado no XML."})
                continue
            codigo = _codigo_catalogo(snap, sel.get("codigo_catalogo"))
            categoria_item = (sel.get("categoria_catalogo") or categoria_padrao or "").strip()

            unidades_validas = {c for c, _ in UnidadeMedidaChoices.choices}
            unidade = snap.get("unidade_catalogo") or UnidadeMedidaChoices.UN
            if unidade not in unidades_validas:
                unidade = UnidadeMedidaChoices.UN

            preco = _decimal_or_zero(snap.get("v_un_com") or "0").quantize(
                Decimal("0.01"),
                rounding=ROUND_HALF_UP,
            )
            ncm = (snap.get("ncm") or "").strip()
            if ncm and len(ncm) != 8:
                ncm = ""

            tipo_fornecedor, fornecedor_existente_id = fornecedor_config_por_item[n_item]
            fornecedor_produto = None
            if tipo_fornecedor == "emitente":
                fornecedor_produto = fornecedor_emitente
            elif tipo_fornecedor == "existente" and fornecedor_existente_id:
                fornecedor_produto = fornecedores_existentes[fornecedor_existente_id]

            if fornecedor_produto:
                fornecedores_usados[str(fornecedor_produto.id)] = fornecedor_produto
                if fornecedor_id is None:
                    fornecedor_id = str(fornecedor_produto.id)
            fabricante_produto = (
                fabricante_padrao_limpo
                or getattr(fornecedor_produto, "razao_social", "")
                or fabricante_emitente
            )[:100]

            origem_mercadoria = OrigemMercadoriaICMSChoices.NACIONAL
            imp = snap.get("imposto") or {}
            orig = (imp.get("orig") or "").strip()[:1]
            if orig in {c for c, _ in OrigemMercadoriaICMSChoices.choices}:
                origem_mercadoria = orig

            unidade_tributavel = ""
            ut = (snap.get("u_trib_catalogo") or "").strip()
            if ut in unidades_validas:
                unidade_tributavel = ut

            existente = Produto.objects.filter(codigo=codigo).first()
            if existente:
                resumo = produto_resumo_para_preview(existente)
                diverge = produto_diverge_do_xml(
                    resumo, snap, categoria_escolhida=categoria_item
                )
                atualizar = bool(sel.get("atualizar_se_existir"))
                if diverge and not atualizar:
                    ignorados.append(
                        {
                            "n_item": n_item,
                            "codigo": codigo,
                            "motivo": (
                                "Código já existe no catálogo; marque «Atualizar com dados do XML» "
                                "para sobrescrever os campos."
                            ),
                        }
                    )
                    continue
                if diverge and atualizar:
                    existente.descricao = (snap.get("x_prod") or codigo)[:255]
                    existente.categoria = categoria_item
                    existente.unidade_medida = unidade
                    existente.preco_base = preco
                    existente.fabricante_parceiro = fornecedor_produto
                    existente.fabricante = fabricante_produto
                    existente.gtin = (snap.get("c_ean") or "")[:14]
                    existente.ncm = ncm
                    existente.cest = (snap.get("cest") or "")[:7]
                    existente.origem_mercadoria = origem_mercadoria
                    existente.unidade_tributavel = unidade_tributavel or ""
                    existente.full_clean()
                    existente.save()
                    produtos_atualizados.append(codigo)
                elif not diverge:
                    fiscal_apenas_alinhados.append(codigo)
                _regravar_item_fiscal_nfe(existente, snap)
                continue

            prod = Produto(
                codigo=codigo,
                descricao=(snap.get("x_prod") or codigo)[:255],
                categoria=categoria_item,
                unidade_medida=unidade,
                preco_base=preco,
                fabricante_parceiro=fornecedor_produto,
                fabricante=fabricante_produto,
                gtin=(snap.get("c_ean") or "")[:14],
                ncm=ncm,
                cest=(snap.get("cest") or "")[:7],
                origem_mercadoria=origem_mercadoria,
                unidade_tributavel=unidade_tributavel,
            )
            prod.full_clean()
            prod.save()
            _regravar_item_fiscal_nfe(prod, snap)
            produtos_criados.append(codigo)

    if not emit.get("cadastro_fornecedor_disponivel") and not usar_emitente:
        avisos.append("Emitente com CPF: cadastro de fornecedor por CNPJ não aplicável.")

    if fiscal_apenas_alinhados:
        amostra = ", ".join(fiscal_apenas_alinhados[:15])
        extra = "…" if len(fiscal_apenas_alinhados) > 15 else ""
        avisos.append(
            "Produtos já alinhados com o XML (só tributação da NF-e regravada): "
            f"{amostra}{extra}"
        )

    fornecedores_associados = [
        {
            "id": fornecedor_id,
            "razao_social": fornecedor.razao_social,
            "cnpj": fornecedor.documento,
        }
        for fornecedor_id, fornecedor in sorted(
            fornecedores_usados.items(),
            key=lambda item: item[1].razao_social.casefold(),
        )
    ]

    return AplicarResultado(
        fornecedor_id=fornecedor_id,
        fornecedor_criado=fornecedor_criado,
        fornecedor_ids=[item["id"] for item in fornecedores_associados],
        fornecedores_associados=fornecedores_associados,
        produtos_criados=produtos_criados,
        produtos_atualizados=produtos_atualizados,
        produtos_ignorados=ignorados,
        avisos=avisos,
    )
