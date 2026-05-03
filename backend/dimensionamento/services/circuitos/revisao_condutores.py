"""Sincroniza `ResumoDimensionamento.condutores_revisao_confirmada` com as flags por circuito / AG."""

from __future__ import annotations

from dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)


def sincronizar_flag_revisao_condutores(projeto) -> None:
    """
    Marca revisão confirmada somente quando todos os circuitos de carga e a
    alimentação geral (se existir) estão com `condutores_aprovado=True`.
    """
    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    circuitos = DimensionamentoCircuitoCarga.objects.filter(projeto=projeto)
    if not circuitos.exists():
        resumo.condutores_revisao_confirmada = False
        resumo.save(update_fields=["condutores_revisao_confirmada", "atualizado_em"])
        return

    if circuitos.filter(condutores_aprovado=False).exists():
        resumo.condutores_revisao_confirmada = False
        resumo.save(update_fields=["condutores_revisao_confirmada", "atualizado_em"])
        return

    ag = DimensionamentoCircuitoAlimentacaoGeral.objects.filter(projeto=projeto).first()
    if ag is not None and not ag.condutores_aprovado:
        resumo.condutores_revisao_confirmada = False
        resumo.save(update_fields=["condutores_revisao_confirmada", "atualizado_em"])
        return

    resumo.condutores_revisao_confirmada = True
    resumo.save(update_fields=["condutores_revisao_confirmada", "atualizado_em"])
