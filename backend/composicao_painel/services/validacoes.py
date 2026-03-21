from __future__ import annotations

from composicao_painel.models import SugestaoItem
from core.choices.gerais import StatusSugestao


# ==========================================================
# PENDÊNCIAS
# ==========================================================

def projeto_tem_sugestoes_pendentes(projeto) -> bool:
    """
    Verifica se existem sugestões pendentes.
    """
    return SugestaoItem.objects.filter(
        projeto=projeto,
        status=StatusSugestao.PENDENTE,
    ).exists()


def quantidade_sugestoes_pendentes(projeto) -> int:
    """
    Retorna a quantidade de sugestões pendentes.
    """
    return SugestaoItem.objects.filter(
        projeto=projeto,
        status=StatusSugestao.PENDENTE,
    ).count()


def listar_sugestoes_pendentes(projeto):
    """
    Lista sugestões pendentes com relacionamentos otimizados.
    """
    return SugestaoItem.objects.filter(
        projeto=projeto,
        status=StatusSugestao.PENDENTE,
    ).select_related(
        "conjunto",
        "produto",
        "carga",
    ).order_by("conjunto__ordem", "id")


# ==========================================================
# CONTROLE DE WIZARD
# ==========================================================

def pode_avancar_wizard_5(projeto) -> bool:
    """
    Regra:
    Só pode avançar se NÃO houver pendências.
    """
    return not projeto_tem_sugestoes_pendentes(projeto)


# ==========================================================
# RESUMO
# ==========================================================

def resumo_pendencias_projeto(projeto) -> dict:
    """
    Retorna resumo estruturado das pendências.
    """
    pendentes = listar_sugestoes_pendentes(projeto)

    return {
        "possui_pendencias": pendentes.exists(),
        "quantidade": pendentes.count(),
        "tipos": list(
            pendentes.values_list("tipo_sugestao", flat=True).distinct()
        ),
    }