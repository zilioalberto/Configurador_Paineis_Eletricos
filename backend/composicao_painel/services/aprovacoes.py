from __future__ import annotations

from decimal import Decimal

from django.db import transaction

from composicao_painel.models import ItemComposicao, SugestaoItem
from core.choices.gerais import StatusSugestao


# ==========================================================
# FUNÇÕES AUXILIARES
# ==========================================================

def obter_item_equivalente(sugestao: SugestaoItem) -> ItemComposicao | None:
    """
    Busca um item equivalente na composição para evitar duplicidade.
    Critério:
    - mesmo projeto
    - mesmo conjunto
    - mesmo produto
    - mesma carga (se aplicável)
    """
    queryset = ItemComposicao.objects.filter(
        projeto=sugestao.projeto,
        conjunto=sugestao.conjunto,
        produto=sugestao.produto,
    )

    if sugestao.carga_id:
        queryset = queryset.filter(carga=sugestao.carga)

    return queryset.first()


# ==========================================================
# APROVAÇÃO
# ==========================================================

@transaction.atomic
def aprovar_sugestao(sugestao: SugestaoItem) -> ItemComposicao:
    """
    Aprova uma sugestão e cria/atualiza o item de composição.
    """

    if sugestao.status == SugestaoItem.StatusSugestao.APROVADA:
        raise ValueError("Sugestão já está aprovada.")

    if sugestao.status == SugestaoItem.StatusSugestao.REJEITADA:
        raise ValueError("Não é possível aprovar uma sugestão rejeitada.")

    if not sugestao.produto:
        raise ValueError("Sugestão não possui produto vinculado.")

    item = obter_item_equivalente(sugestao)

    # ======================================================
    # ATUALIZA ITEM EXISTENTE
    # ======================================================
    if item:
        quantidade_atual = item.quantidade or Decimal("0")
        quantidade_sugestao = sugestao.quantidade or Decimal("0")

        item.quantidade = quantidade_atual + quantidade_sugestao

        update_fields = ["quantidade"]

        if not item.descricao_complementar and sugestao.descricao:
            item.descricao_complementar = sugestao.descricao
            update_fields.append("descricao_complementar")

        if not item.unidade and sugestao.unidade:
            item.unidade = sugestao.unidade
            update_fields.append("unidade")

        if not item.observacoes and sugestao.justificativa:
            item.observacoes = sugestao.justificativa
            update_fields.append("observacoes")

        item.save(update_fields=update_fields + ["updated_at"])

    # ======================================================
    # CRIA NOVO ITEM
    # ======================================================
    else:
        item = ItemComposicao.objects.create(
            projeto=sugestao.projeto,
            conjunto=sugestao.conjunto,
            produto=sugestao.produto,
            quantidade=sugestao.quantidade or Decimal("0"),
            origem=ItemComposicao.OrigemItem.SUGESTAO_APROVADA,
            carga=sugestao.carga,
            descricao_complementar=sugestao.descricao or "",
            unidade=sugestao.unidade or "",
            observacoes=sugestao.justificativa or "",
        )

    # Atualiza status da sugestão
    sugestao.status = SugestaoItem.StatusSugestao.APROVADA
    sugestao.save(update_fields=["status", "updated_at"])

    return item


# ==========================================================
# REJEIÇÃO
# ==========================================================

@transaction.atomic
def rejeitar_sugestao(sugestao: SugestaoItem) -> SugestaoItem:
    """
    Rejeita uma sugestão.
    """

    if sugestao.status == SugestaoItem.StatusSugestao.APROVADA:
        raise ValueError("Não é possível rejeitar uma sugestão já aprovada.")

    sugestao.status = SugestaoItem.StatusSugestao.REJEITADA
    sugestao.save(update_fields=["status", "updated_at"])

    return sugestao


# ==========================================================
# OPERAÇÕES EM LOTE
# ==========================================================

@transaction.atomic
def aprovar_sugestoes_projeto(projeto) -> int:
    """
    Aprova todas as sugestões pendentes do projeto.
    """
    sugestoes = SugestaoItem.objects.filter(
        projeto=projeto,
        status=SugestaoItem.StatusSugestao.PENDENTE,
    ).select_related("conjunto", "produto", "carga")

    total = 0

    for sugestao in sugestoes:
        aprovar_sugestao(sugestao)
        total += 1

    return total


@transaction.atomic
def rejeitar_sugestoes_projeto(projeto) -> int:
    """
    Rejeita todas as sugestões pendentes do projeto.
    """
    sugestoes = SugestaoItem.objects.filter(
        projeto=projeto,
        status=SugestaoItem.StatusSugestao.PENDENTE,
    )

    total = sugestoes.count()

    sugestoes.update(status=StatusSugestao.REJEITADA)

    return total