"""Consultas otimizadas para montagem do payload Kanban."""

from decimal import Decimal

from django.db.models import Count, DecimalField, OuterRef, Prefetch, Q, Subquery, Sum
from django.db.models.functions import Coalesce

from apps.tarefas.models import (
    ApontamentoHora,
    ColunaTarefa,
    QuadroTarefa,
    StatusAprovacaoHoraChoices,
    Tarefa,
)


TOTAL_HORAS_FIELD = DecimalField(max_digits=8, decimal_places=2)


def _apontamentos_validos_qs():
    return ApontamentoHora.objects.exclude(
        status_aprovacao__in=(
            StatusAprovacaoHoraChoices.REJEITADO,
            StatusAprovacaoHoraChoices.CANCELADO,
            StatusAprovacaoHoraChoices.REPROVADO,
        )
    )


def tarefas_com_total_horas_queryset(queryset, colaborador=None):
    """
    Soma horas apontadas por tarefa. Se `colaborador` for passado, apenas os
    apontamentos desse utilizador (visão individual no Kanban / lista).
    """
    ap_qs = _apontamentos_validos_qs().filter(tarefa=OuterRef("pk"))
    if colaborador is not None:
        ap_qs = ap_qs.filter(colaborador_id=colaborador.pk)
    total_apontamentos = (
        ap_qs.values("tarefa").annotate(total=Sum("horas")).values("total")
    )
    return queryset.annotate(
        total_horas_apontadas=Coalesce(
            Subquery(total_apontamentos, output_field=TOTAL_HORAS_FIELD),
            Decimal("0.00"),
            output_field=TOTAL_HORAS_FIELD,
        )
    )


def tarefas_do_usuario_q(usuario):
    return (
        Q(colunas__tarefas__responsavel=usuario)
        | Q(colunas__tarefas__colaboradores=usuario)
        | Q(colunas__tarefas__criador=usuario)
    )


def tarefa_acessivel_usuario_q(usuario):
    return (
        Q(responsavel=usuario)
        | Q(colaboradores=usuario)
        | Q(criador=usuario)
    )


def quadros_ativos_queryset(*, usuario=None, somente_minhas=False):
    filtro_tarefas = (
        tarefas_do_usuario_q(usuario)
        if somente_minhas and usuario is not None
        else Q()
    )
    return QuadroTarefa.objects.filter(ativo=True).annotate(
        total_tarefas=Count("colunas__tarefas", filter=filtro_tarefas, distinct=True)
    )


def quadro_kanban_queryset(*, usuario=None, somente_minhas=False):
    tarefas = tarefas_com_total_horas_queryset(
        Tarefa.objects.select_related("responsavel", "criador")
        .prefetch_related("colaboradores"),
        colaborador=usuario,
    )
    if somente_minhas and usuario is not None:
        tarefas = tarefas.filter(tarefa_acessivel_usuario_q(usuario)).distinct()
    tarefas = tarefas.order_by("ordem", "prazo", "titulo")

    colunas = ColunaTarefa.objects.order_by("ordem", "nome").prefetch_related(
        Prefetch("tarefas", queryset=tarefas)
    )
    return quadros_ativos_queryset(
        usuario=usuario,
        somente_minhas=somente_minhas,
    ).prefetch_related(Prefetch("colunas", queryset=colunas))
