from __future__ import annotations

from decimal import Decimal

from django.db import transaction
from django.utils import timezone

from apps.fiscal.services import p_ipi_referencia_produto
from apps.orcamentos.models import (
    Orcamento,
    OrcamentoItem,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from apps.orcamentos.services.preco_linha import calcular_preco_unitario_linha


@transaction.atomic
def revisar_preco_catalogo_item_orcamento(
    orcamento: Orcamento,
    item_id,
    *,
    custo_referencia: Decimal,
    justificativa: str,
) -> OrcamentoItem:
    if orcamento.status != StatusOrcamentoChoices.RASCUNHO:
        raise ValueError("Somente ofertas em rascunho podem revisar preço a partir do orçamento.")

    item = (
        OrcamentoItem.objects.select_related("produto", "servico")
        .filter(orcamento=orcamento, pk=item_id, editavel=True)
        .first()
    )
    if item is None:
        raise ValueError("Item de orçamento não encontrado ou não editável.")
    if custo_referencia < 0:
        raise ValueError("Custo de referência não pode ser negativo.")
    if not justificativa.strip():
        raise ValueError("Informe a justificativa da revisão de preço.")

    if item.tipo == TipoItemOrcamentoChoices.PRODUTO and item.produto_id:
        item.produto.custo_referencia = custo_referencia
        item.produto.custo_atualizado_em = timezone.now()
        item.produto.save(update_fields=("custo_referencia", "custo_atualizado_em"))
        item.aliquota_ipi = p_ipi_referencia_produto(item.produto)
    elif item.tipo == TipoItemOrcamentoChoices.SERVICO and item.servico_id:
        item.servico.custo_referencia = custo_referencia
        item.servico.custo_atualizado_em = timezone.now()
        item.servico.save(update_fields=("custo_referencia", "custo_atualizado_em"))
        item.aliquota_ipi = None
    else:
        raise ValueError("A linha não possui vínculo com produto ou serviço do catálogo.")

    item.custo_unitario = custo_referencia
    item.preco_unitario = calcular_preco_unitario_linha(
        item.custo_unitario,
        item.margem_percentual,
        item.aliquota_ipi,
    )
    item.save(
        update_fields=(
            "custo_unitario",
            "aliquota_ipi",
            "preco_unitario",
        )
    )
    return item
