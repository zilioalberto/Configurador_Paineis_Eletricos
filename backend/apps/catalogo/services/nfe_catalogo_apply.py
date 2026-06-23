"""Persistência da importação de NF-e: produtos, fornecedores e itens fiscais."""

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
from apps.fiscal.choices import ObjetivoEntradaFiscalChoices
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


def _regravar_item_fiscal_nfe(
    prod: Produto,
    snap: dict[str, Any],
    *,
    objetivo_entrada: str,
) -> None:
    n_item = int(snap.get("n_item") or 0)
    if n_item > 0:
        ItemFiscalProduto.objects.filter(
            produto=prod,
            n_item_nfe=n_item,
        ).delete()
    criar_item_fiscal_importacao_nfe(prod, snap, objetivo_entrada=objetivo_entrada)


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


FornecedorConfig = tuple[str, str | None]


@dataclass
class _AplicarContexto:
    by_nitem: dict[int, dict[str, Any]]
    fornecedor_config_por_item: dict[int, FornecedorConfig]
    fabricante_config_por_item: dict[int, FornecedorConfig]
    fornecedores_existentes: dict[str, ParceiroComercial]
    fornecedor_emitente: ParceiroComercial | None
    unidades_validas: set[str]
    categoria_padrao: str
    fornecedor_id: str | None
    fornecedores_usados: dict[str, ParceiroComercial]
    produtos_criados: list[str]
    produtos_atualizados: list[str]
    produtos_ignorados: list[dict]
    fiscal_apenas_alinhados: list[str]
    objetivo_entrada: str


def _validar_categoria_padrao(categoria_padrao: str) -> set[str]:
    categorias_validas = {c for c, _ in CategoriaProdutoNomeChoices.choices}
    if categoria_padrao and categoria_padrao not in categorias_validas:
        raise ValueError("Categoria inválida.")
    return categorias_validas


def _validar_emitente_para_fornecedor(emit: dict[str, Any], cnpj: str) -> None:
    if not emit.get("cadastro_fornecedor_disponivel"):
        raise ValueError("Emitente não possui CNPJ válido para cadastro de fornecedor.")
    if len(cnpj) != 14:
        raise ValueError("CNPJ do emitente inválido.")


def _config_fornecedor_item(
    sel: dict,
    *,
    fornecedor_id_global: str,
    criar_fornecedor: bool,
) -> FornecedorConfig:
    item_fornecedor_id = str(sel.get("fornecedor_id") or "")
    if item_fornecedor_id:
        return ("existente", item_fornecedor_id)
    if "criar_fornecedor" in sel:
        return ("emitente" if bool(sel.get("criar_fornecedor")) else "nenhum", None)
    if fornecedor_id_global:
        return ("existente", fornecedor_id_global)
    if criar_fornecedor:
        return ("emitente", None)
    return ("nenhum", None)


def _montar_config_fornecedor_por_item(
    selecao_por_item: dict[int, dict],
    *,
    fornecedor_id_global: str,
    criar_fornecedor: bool,
) -> dict[int, FornecedorConfig]:
    return {
        n_item: _config_fornecedor_item(
            sel,
            fornecedor_id_global=fornecedor_id_global,
            criar_fornecedor=criar_fornecedor,
        )
        for n_item, sel in selecao_por_item.items()
    }


def _config_fabricante_item(sel: dict, fornecedor_config: FornecedorConfig) -> FornecedorConfig:
    item_fabricante_id = str(sel.get("fabricante_id") or "")
    if item_fabricante_id:
        return ("existente", item_fabricante_id)
    if "criar_fabricante" in sel:
        return ("emitente" if bool(sel.get("criar_fabricante")) else "nenhum", None)
    return fornecedor_config


def _montar_config_fabricante_por_item(
    selecao_por_item: dict[int, dict],
    fornecedor_config_por_item: dict[int, FornecedorConfig],
) -> dict[int, FornecedorConfig]:
    return {
        n_item: _config_fabricante_item(sel, fornecedor_config_por_item[n_item])
        for n_item, sel in selecao_por_item.items()
    }


def _validar_categorias_itens(
    selecao_por_item: dict[int, dict],
    *,
    categoria_padrao: str,
    categorias_validas: set[str],
) -> None:
    for n_item, sel in sorted(selecao_por_item.items()):
        categoria_item = (sel.get("categoria_catalogo") or categoria_padrao or "").strip()
        if not categoria_item:
            raise ValueError(f"Categoria obrigatória para o item {n_item}.")
        if categoria_item not in categorias_validas:
            raise ValueError(f"Categoria inválida para o item {n_item}.")


def _buscar_parceiros_existentes(
    *configs: dict[int, FornecedorConfig],
) -> dict[str, ParceiroComercial]:
    fornecedor_ids = {
        fid
        for config in configs
        for tipo, fid in config.values()
        if tipo == "existente" and fid
    }
    fornecedores = {
        str(fornecedor.id): fornecedor
        for fornecedor in ParceiroComercial.objects.filter(
            id__in=fornecedor_ids,
            eh_fornecedor=True,
            ativo=True,
        )
    }
    if fornecedor_ids - set(fornecedores):
        raise ValueError("Fornecedor/fabricante selecionado não encontrado.")
    return fornecedores


def _obter_ou_criar_fornecedor_emitente(
    emit: dict[str, Any],
    cnpj: str,
) -> tuple[ParceiroComercial, bool]:
    _validar_emitente_para_fornecedor(emit, cnpj)
    fornecedor, created = ParceiroComercial.objects.get_or_create(
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
    if not fornecedor.eh_fornecedor:
        fornecedor.eh_fornecedor = True
        fornecedor.ativo = True
        fornecedor.save(update_fields=("eh_fornecedor", "ativo", "atualizado_em"))
    EnderecoParceiro.objects.get_or_create(
        parceiro=fornecedor,
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
    return fornecedor, created


def _unidade_item(snap: dict[str, Any], unidades_validas: set[str]) -> str:
    unidade = snap.get("unidade_catalogo") or UnidadeMedidaChoices.UN
    return unidade if unidade in unidades_validas else UnidadeMedidaChoices.UN


def _preco_item(snap: dict[str, Any]) -> Decimal:
    return _decimal_or_zero(snap.get("v_un_com") or "0").quantize(
        Decimal("0.01"),
        rounding=ROUND_HALF_UP,
    )


def _ncm_item(snap: dict[str, Any]) -> str:
    ncm = (snap.get("ncm") or "").strip()
    return ncm if len(ncm) == 8 else ""


def _origem_mercadoria_item(snap: dict[str, Any]) -> str:
    origem_padrao = OrigemMercadoriaICMSChoices.NACIONAL
    orig = ((snap.get("imposto") or {}).get("orig") or "").strip()[:1]
    origens_validas = {c for c, _ in OrigemMercadoriaICMSChoices.choices}
    return orig if orig in origens_validas else origem_padrao


def _unidade_tributavel_item(snap: dict[str, Any], unidades_validas: set[str]) -> str:
    ut = (snap.get("u_trib_catalogo") or "").strip()
    return ut if ut in unidades_validas else ""


def _fornecedor_produto(ctx: _AplicarContexto, n_item: int) -> ParceiroComercial | None:
    tipo_fornecedor, fornecedor_existente_id = ctx.fornecedor_config_por_item[n_item]
    if tipo_fornecedor == "emitente":
        return ctx.fornecedor_emitente
    if tipo_fornecedor == "existente" and fornecedor_existente_id:
        return ctx.fornecedores_existentes[fornecedor_existente_id]
    return None


def _fabricante_parceiro_produto(ctx: _AplicarContexto, n_item: int) -> ParceiroComercial | None:
    tipo_fabricante, fabricante_existente_id = ctx.fabricante_config_por_item[n_item]
    if tipo_fabricante == "emitente":
        return ctx.fornecedor_emitente
    if tipo_fabricante == "existente" and fabricante_existente_id:
        return ctx.fornecedores_existentes[fabricante_existente_id]
    return None


def _registrar_fornecedor_uso(
    ctx: _AplicarContexto,
    fornecedor: ParceiroComercial | None,
) -> None:
    if not fornecedor:
        return
    ctx.fornecedores_usados[str(fornecedor.id)] = fornecedor
    if ctx.fornecedor_id is None:
        ctx.fornecedor_id = str(fornecedor.id)


def _produto_payload(
    *,
    codigo: str,
    snap: dict[str, Any],
    categoria_item: str,
    fornecedor_produto: ParceiroComercial | None,
    fabricante_parceiro: ParceiroComercial | None,
    unidade: str,
    preco: Decimal,
    ncm: str,
    origem_mercadoria: str,
    unidade_tributavel: str,
) -> dict[str, Any]:
    return {
        "codigo": codigo,
        "descricao": (snap.get("x_prod") or codigo)[:255],
        "categoria": categoria_item,
        "unidade_medida": unidade,
        "custo_referencia": preco,
        "fabricante_parceiro": fabricante_parceiro,
        "fornecedor_parceiro": fornecedor_produto,
        "gtin": (snap.get("c_ean") or "")[:14],
        "ncm": ncm,
        "cest": (snap.get("cest") or "")[:7],
        "origem_mercadoria": origem_mercadoria,
        "unidade_tributavel": unidade_tributavel,
    }


def _atualizar_produto(produto: Produto, payload: dict[str, Any]) -> None:
    for campo, valor in payload.items():
        if campo != "codigo":
            setattr(produto, campo, valor)
    produto.full_clean()
    produto.save()


def _processar_produto_existente(
    *,
    ctx: _AplicarContexto,
    produto: Produto,
    snap: dict[str, Any],
    sel: dict,
    n_item: int,
    codigo: str,
    categoria_item: str,
    payload: dict[str, Any],
) -> None:
    resumo = produto_resumo_para_preview(produto)
    diverge = produto_diverge_do_xml(resumo, snap, categoria_escolhida=categoria_item)
    atualizar = bool(sel.get("atualizar_se_existir"))
    if diverge and not atualizar:
        ctx.produtos_ignorados.append(
            {
                "n_item": n_item,
                "codigo": codigo,
                "motivo": (
                    "Código já existe no catálogo; marque «Atualizar com dados do XML» "
                    "para sobrescrever os campos."
                ),
            }
        )
        return
    if diverge and atualizar:
        _atualizar_produto(produto, payload)
        ctx.produtos_atualizados.append(codigo)
    else:
        ctx.fiscal_apenas_alinhados.append(codigo)
    _regravar_item_fiscal_nfe(produto, snap, objetivo_entrada=ctx.objetivo_entrada)


def _aplicar_item_importacao(ctx: _AplicarContexto, n_item: int, sel: dict) -> None:
    snap = ctx.by_nitem.get(n_item)
    if not snap:
        ctx.produtos_ignorados.append({"n_item": n_item, "motivo": "Item não encontrado no XML."})
        return

    codigo = _codigo_catalogo(snap, sel.get("codigo_catalogo"))
    categoria_item = (sel.get("categoria_catalogo") or ctx.categoria_padrao or "").strip()
    fornecedor_produto = _fornecedor_produto(ctx, n_item)
    fabricante_parceiro = _fabricante_parceiro_produto(ctx, n_item)
    _registrar_fornecedor_uso(ctx, fornecedor_produto)
    payload = _produto_payload(
        codigo=codigo,
        snap=snap,
        categoria_item=categoria_item,
        fornecedor_produto=fornecedor_produto,
        fabricante_parceiro=fabricante_parceiro,
        unidade=_unidade_item(snap, ctx.unidades_validas),
        preco=_preco_item(snap),
        ncm=_ncm_item(snap),
        origem_mercadoria=_origem_mercadoria_item(snap),
        unidade_tributavel=_unidade_tributavel_item(snap, ctx.unidades_validas),
    )

    existente = Produto.objects.filter(codigo=codigo).first()
    if existente:
        _processar_produto_existente(
            ctx=ctx,
            produto=existente,
            snap=snap,
            sel=sel,
            n_item=n_item,
            codigo=codigo,
            categoria_item=categoria_item,
            payload=payload,
        )
        return

    produto = Produto(**payload)
    produto.full_clean()
    produto.save()
    _regravar_item_fiscal_nfe(produto, snap, objetivo_entrada=ctx.objetivo_entrada)
    ctx.produtos_criados.append(codigo)


def aplicar_importacao_nfe(
    *,
    snapshot: dict[str, Any],
    criar_fornecedor: bool,
    categoria_padrao: str,
    itens: list[dict],
    fornecedor_id: str | None = None,
    objetivo_entrada: str = ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
) -> AplicarResultado:
    categorias_validas = _validar_categoria_padrao(categoria_padrao)
    emit = snapshot.get("emitente") or {}
    cnpj = (emit.get("cnpj") or "").strip()
    avisos: list[str] = []

    if criar_fornecedor:
        _validar_emitente_para_fornecedor(emit, cnpj)

    by_nitem = {int(x["n_item"]): x for x in snapshot.get("itens", []) if "n_item" in x}
    selecao_por_item = {int(x["n_item"]): x for x in itens if x.get("importar")}
    fornecedor_id_global = str(fornecedor_id) if fornecedor_id else ""
    fornecedor_config_por_item = _montar_config_fornecedor_por_item(
        selecao_por_item,
        fornecedor_id_global=fornecedor_id_global,
        criar_fornecedor=criar_fornecedor,
    )
    fabricante_config_por_item = _montar_config_fabricante_por_item(
        selecao_por_item,
        fornecedor_config_por_item,
    )

    usar_emitente = any(
        tipo == "emitente"
        for config in (fornecedor_config_por_item, fabricante_config_por_item)
        for tipo, _ in config.values()
    )
    _validar_categorias_itens(
        selecao_por_item,
        categoria_padrao=categoria_padrao,
        categorias_validas=categorias_validas,
    )

    fornecedores_existentes = _buscar_parceiros_existentes(
        fornecedor_config_por_item,
        fabricante_config_por_item,
    )

    produtos_criados: list[str] = []
    produtos_atualizados: list[str] = []
    ignorados: list[dict] = []
    fornecedor_id: str | None = None
    fornecedor_criado = False
    fornecedor_emitente: ParceiroComercial | None = None
    fornecedores_usados: dict[str, ParceiroComercial] = {}

    fiscal_apenas_alinhados: list[str] = []
    objetivo_entrada_limpo = objetivo_entrada or ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS

    with transaction.atomic():
        if usar_emitente:
            fornecedor_emitente, created = _obter_ou_criar_fornecedor_emitente(emit, cnpj)
            fornecedor_id = str(fornecedor_emitente.id)
            fornecedor_criado = created

        ctx = _AplicarContexto(
            by_nitem=by_nitem,
            fornecedor_config_por_item=fornecedor_config_por_item,
            fabricante_config_por_item=fabricante_config_por_item,
            fornecedores_existentes=fornecedores_existentes,
            fornecedor_emitente=fornecedor_emitente,
            unidades_validas={c for c, _ in UnidadeMedidaChoices.choices},
            categoria_padrao=categoria_padrao,
            fornecedor_id=fornecedor_id,
            fornecedores_usados=fornecedores_usados,
            produtos_criados=produtos_criados,
            produtos_atualizados=produtos_atualizados,
            produtos_ignorados=ignorados,
            fiscal_apenas_alinhados=fiscal_apenas_alinhados,
            objetivo_entrada=objetivo_entrada_limpo,
        )
        for n_item, sel in sorted(selecao_por_item.items()):
            _aplicar_item_importacao(ctx, n_item, sel)
        fornecedor_id = ctx.fornecedor_id

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
