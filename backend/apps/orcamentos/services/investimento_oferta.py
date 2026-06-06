"""Montagem da tabela de investimento da oferta (itens unitários, painéis ou consolidado)."""
from __future__ import annotations

from decimal import Decimal

from apps.orcamentos.models import (
    ModoConfiguradorPainelChoices,
    Orcamento,
    OrcamentoItem,
    PerfilOfertaChoices,
)
from apps.orcamentos.services.investimento_descricao import (
    INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO,
    descricao_investimento_consolidada_padrao,
    descricao_investimento_exibicao,
)
from apps.orcamentos.services.ncm_investimento import ncm_investimento_orcamento


def _decimal_str(value: Decimal | None) -> str:
    if value is None:
        return "0"
    normalized = value.normalize()
    if normalized == normalized.to_integral():
        return str(normalized.quantize(Decimal("1")))
    return format(normalized, "f")


def _subtotal(item: OrcamentoItem) -> Decimal:
    return item.quantidade * item.preco_unitario


def _item_linha(item: OrcamentoItem) -> dict:
    return {
        "id": str(item.id),
        "ordem": item.ordem,
        "tipo": item.tipo,
        "codigo": item.servico.codigo
        if item.servico_id
        else item.produto.codigo
        if item.produto_id
        else "",
        "descricao": item.descricao,
        "quantidade": _decimal_str(item.quantidade),
        "preco_unitario": _decimal_str(item.preco_unitario),
        "subtotal": _decimal_str(_subtotal(item)),
        "unidade": item.servico.unidade_medida if item.servico_id else "",
        "ncm": item.produto.ncm if item.produto_id and item.produto.ncm else "",
    }


def _linha_investimento(
    *,
    descricao: str,
    subtotal: Decimal,
    ncm: str = "",
    unidade: str = "un",
) -> dict:
    return {
        "descricao": descricao,
        "quantidade": "1",
        "preco_unitario": _decimal_str(subtotal),
        "subtotal": _decimal_str(subtotal),
        "unidade": unidade,
        "ncm": ncm,
    }


def _investimento_materiais(itens: list[OrcamentoItem]) -> dict:
    return {
        "modo": "ITENS_UNITARIOS",
        "titulo": "Investimento",
        "itens": [_item_linha(item) for item in itens],
    }


def _investimento_por_painel(
    orcamento: Orcamento,
    itens: list[OrcamentoItem],
    ncm: str,
    *,
    descricao_demais_padrao: str = INVESTIMENTO_DESCRICAO_DEMAIS_PADRAO,
) -> dict | None:
    paineis = list(
        orcamento.configuradores_painel.filter(
            modo=ModoConfiguradorPainelChoices.ATIVO,
        ).order_by("ordem", "id")
    )
    if not paineis:
        return None

    itens_por_painel: dict = {p.id: [] for p in paineis}
    sem_painel: list[OrcamentoItem] = []
    for item in itens:
        if item.configurador_painel_id and item.configurador_painel_id in itens_por_painel:
            itens_por_painel[item.configurador_painel_id].append(item)
        else:
            sem_painel.append(item)

    linhas: list[dict] = []
    for painel in paineis:
        grupo = itens_por_painel.get(painel.id) or []
        if not grupo:
            continue
        sub = sum((_subtotal(i) for i in grupo), Decimal("0"))
        linhas.append(
            _linha_investimento(
                descricao=painel.descricao_painel.strip() or "Painel",
                subtotal=sub,
                ncm=ncm,
            )
        )

    if sem_painel:
        sub = sum((_subtotal(i) for i in sem_painel), Decimal("0"))
        linhas.append(
            _linha_investimento(
                descricao=descricao_investimento_exibicao(
                    orcamento, descricao_demais_padrao
                ),
                subtotal=sub,
                ncm=ncm,
            )
        )

    if not linhas:
        return None

    return {
        "modo": "POR_PAINEL",
        "titulo": "Investimento",
        "itens": linhas,
    }


def _investimento_solucao_completa(orcamento: Orcamento, itens: list[OrcamentoItem]) -> dict:
    ncm = ncm_investimento_orcamento(orcamento)
    por_painel = _investimento_por_painel(orcamento, itens, ncm)
    if por_painel:
        return por_painel

    total = sum((_subtotal(item) for item in itens), Decimal("0"))
    return {
        "modo": "CONSOLIDADO",
        "titulo": "Investimento",
        "itens": [
            _linha_investimento(
                descricao=descricao_investimento_exibicao(
                    orcamento,
                    descricao_investimento_consolidada_padrao(orcamento.titulo),
                ),
                subtotal=total,
                ncm=ncm,
            )
        ],
    }


def montar_investimento_oferta(orcamento: Orcamento, itens: list[OrcamentoItem]) -> dict:
    perfil = orcamento.perfil_oferta or PerfilOfertaChoices.MATERIAIS
    if perfil == PerfilOfertaChoices.SOLUCAO_COMPLETA:
        return _investimento_solucao_completa(orcamento, itens)
    return _investimento_materiais(itens)
