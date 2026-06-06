from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta

from django.utils import timezone

from apps.configuracoes_erp.models import ParametroConfiguracao
from apps.orcamentos.models import Orcamento, TipoItemOrcamentoChoices

CHAVE_VALIDADE_DIAS = "orcamentos.catalogo_preco_validade_dias"
CHAVE_BLOQUEAR_PRECO_DESATUALIZADO = "orcamentos.bloquear_finalizacao_preco_desatualizado"

VALIDADE_DIAS_PADRAO = 30
BLOQUEAR_PADRAO = True


@dataclass(frozen=True)
class ItemPrecoCatalogoDesatualizado:
    linha: int
    codigo: str
    descricao: str
    tipo: str
    preco_atualizado_em: object | None


def _parametro(chave: str) -> str | None:
    return (
        ParametroConfiguracao.objects.filter(chave=chave)
        .values_list("valor", flat=True)
        .first()
    )


def validade_preco_catalogo_dias() -> int:
    valor = _parametro(CHAVE_VALIDADE_DIAS)
    try:
        dias = int(str(valor).strip()) if valor is not None else VALIDADE_DIAS_PADRAO
    except (TypeError, ValueError):
        dias = VALIDADE_DIAS_PADRAO
    return max(dias, 0)


def bloquear_finalizacao_preco_desatualizado() -> bool:
    valor = _parametro(CHAVE_BLOQUEAR_PRECO_DESATUALIZADO)
    if valor is None:
        return BLOQUEAR_PADRAO
    return str(valor).strip().lower() in {"1", "true", "sim", "s", "yes", "y"}


def itens_com_preco_catalogo_desatualizado(
    orcamento: Orcamento,
) -> list[ItemPrecoCatalogoDesatualizado]:
    validade_dias = validade_preco_catalogo_dias()
    limite = timezone.now() - timedelta(days=validade_dias)
    problemas: list[ItemPrecoCatalogoDesatualizado] = []
    itens = orcamento.itens.select_related("produto", "servico").order_by("ordem", "id")

    for indice, item in enumerate(itens, start=1):
        referencia = None
        codigo = ""
        if item.tipo == TipoItemOrcamentoChoices.SERVICO and item.servico_id:
            referencia = item.servico
            codigo = item.servico.codigo
        elif item.tipo == TipoItemOrcamentoChoices.PRODUTO and item.produto_id:
            referencia = item.produto
            codigo = item.produto.codigo

        if referencia is None:
            continue

        preco_atualizado_em = getattr(referencia, "preco_atualizado_em", None)
        if preco_atualizado_em is None or preco_atualizado_em < limite:
            problemas.append(
                ItemPrecoCatalogoDesatualizado(
                    linha=indice,
                    codigo=codigo,
                    descricao=item.descricao,
                    tipo=item.tipo,
                    preco_atualizado_em=preco_atualizado_em,
                )
            )

    return problemas


def preco_catalogo_item_desatualizado(item) -> bool:
    validade_dias = validade_preco_catalogo_dias()
    limite = timezone.now() - timedelta(days=validade_dias)
    referencia = None
    if item.tipo == TipoItemOrcamentoChoices.SERVICO and item.servico_id:
        referencia = item.servico
    elif item.tipo == TipoItemOrcamentoChoices.PRODUTO and item.produto_id:
        referencia = item.produto

    if referencia is None:
        return False
    preco_atualizado_em = getattr(referencia, "preco_atualizado_em", None)
    return preco_atualizado_em is None or preco_atualizado_em < limite


def validar_finalizacao_preco_catalogo(orcamento: Orcamento) -> None:
    if not bloquear_finalizacao_preco_desatualizado():
        return

    problemas = itens_com_preco_catalogo_desatualizado(orcamento)
    if not problemas:
        return

    validade_dias = validade_preco_catalogo_dias()
    detalhes = "; ".join(
        f"linha {p.linha} ({p.codigo or p.tipo})"
        for p in problemas[:5]
    )
    excedente = len(problemas) - 5
    if excedente > 0:
        detalhes = f"{detalhes}; +{excedente} item(ns)"
    raise ValueError(
        "Existem itens de catálogo com preço sem revisão dentro do prazo "
        f"configurado ({validade_dias} dia(s)): {detalhes}. "
        "Atualize os preços no catálogo e use Atualizar oferta antes de finalizar."
    )
