from __future__ import annotations

from django.db import transaction

from apps.fiscal.services import p_ipi_referencia_produto
from apps.orcamentos.models import (
    ConfiguracaoMargemCliente,
    Orcamento,
    OrcamentoItem,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from apps.orcamentos.services.preco_linha import calcular_preco_unitario_linha


@transaction.atomic
def atualizar_oferta_rascunho(orcamento: Orcamento) -> list[OrcamentoItem]:
    if orcamento.status != StatusOrcamentoChoices.RASCUNHO:
        raise ValueError("Somente propostas em rascunho podem ser atualizadas.")

    if orcamento.cliente_id:
        config = ConfiguracaoMargemCliente.objects.filter(cliente=orcamento.cliente).first()
        if config:
            orcamento.margem_produtos_percentual = config.margem_produtos_percentual
            orcamento.margem_servicos_percentual = config.margem_servicos_percentual
            orcamento.save(
                update_fields=(
                    "margem_produtos_percentual",
                    "margem_servicos_percentual",
                    "atualizado_em",
                )
            )

    atualizados: list[OrcamentoItem] = []
    itens = OrcamentoItem.objects.select_related("produto", "servico").filter(
        orcamento=orcamento,
        editavel=True,
    )
    for item in itens:
        margem = (
            orcamento.margem_servicos_percentual
            if item.tipo == TipoItemOrcamentoChoices.SERVICO
            else orcamento.margem_produtos_percentual
        )
        custo = item.custo_unitario
        aliquota_ipi = item.aliquota_ipi

        if item.tipo == TipoItemOrcamentoChoices.PRODUTO and item.produto_id:
            item.produto.refresh_from_db(fields=("custo_referencia",))
            custo = item.produto.custo_referencia
            aliquota_ipi = p_ipi_referencia_produto(item.produto)
        elif item.tipo == TipoItemOrcamentoChoices.SERVICO and item.servico_id:
            item.servico.refresh_from_db(fields=("custo_referencia",))
            custo = item.servico.custo_referencia
            aliquota_ipi = None

        item.custo_unitario = custo
        item.margem_percentual = margem
        item.aliquota_ipi = aliquota_ipi
        item.preco_unitario = calcular_preco_unitario_linha(custo, margem, aliquota_ipi)
        item.save(
            update_fields=(
                "custo_unitario",
                "margem_percentual",
                "aliquota_ipi",
                "preco_unitario",
            )
        )
        atualizados.append(item)

    return atualizados
