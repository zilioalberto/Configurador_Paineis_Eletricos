"""Integração financeira — registro de pagamento de impostos (Fase 4)."""
from __future__ import annotations

from apps.fiscal.models_obrigacoes import LancamentoFinanceiroImposto, ObrigacaoFiscal


def registrar_pagamento_obrigacao(
    *,
    obrigacao: ObrigacaoFiscal,
    conta: str = "Impostos",
    centro_custo: str = "Administrativo",
) -> LancamentoFinanceiroImposto:
    """Cria lançamento financeiro local (módulo financeiro completo — futuro)."""
    lancamento, _ = LancamentoFinanceiroImposto.objects.update_or_create(
        obrigacao=obrigacao,
        defaults={
            "valor": obrigacao.valor,
            "data": obrigacao.data_pagamento,
            "conta": conta,
            "centro_custo": centro_custo,
            "observacoes": f"Pagamento {obrigacao.get_tipo_display()} — {obrigacao.pacote.competencia}",
        },
    )
    return lancamento
