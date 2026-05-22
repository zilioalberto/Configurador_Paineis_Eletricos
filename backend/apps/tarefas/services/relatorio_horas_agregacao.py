"""Agregações do relatório de horas (extraídas de relatorio_horas_gestao)."""

from __future__ import annotations

from datetime import date, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Count, QuerySet, Sum
from django.utils import timezone

from apps.tarefas.models import ApontamentoHora, StatusAprovacaoHoraChoices, TipoTarefaChoices

User = get_user_model()


def _nome_usuario(usuario) -> str:
    if not usuario:
        return ""
    nome = f"{usuario.first_name} {usuario.last_name}".strip()
    return nome or usuario.email


def apontamentos_validos_queryset():
    return ApontamentoHora.objects.exclude(
        status_aprovacao__in=(
            StatusAprovacaoHoraChoices.REJEITADO,
            StatusAprovacaoHoraChoices.CANCELADO,
            StatusAprovacaoHoraChoices.REPROVADO,
        )
    )


def resolver_periodo_relatorio(
    data_inicio: date | None,
    data_fim: date | None,
) -> tuple[date, date]:
    hoje = timezone.localdate()
    if data_fim is None and data_inicio is None:
        data_fim = hoje
        data_inicio = data_fim - timedelta(days=89)
    elif data_fim is None:
        data_fim = hoje
    elif data_inicio is None:
        data_inicio = data_fim - timedelta(days=89)

    if data_inicio > data_fim:
        raise ValueError("data_inicio nao pode ser maior que data_fim.")
    return data_inicio, data_fim


def queryset_apontamentos_periodo(
    *,
    data_inicio: date,
    data_fim: date,
    proposta_ref: str | None,
    ordem_producao_ref: str | None,
    colaborador_id: int | None,
) -> QuerySet[ApontamentoHora]:
    if proposta_ref and ordem_producao_ref:
        raise ValueError("Informe apenas proposta ou ordem de producao, nao ambos.")

    qs = (
        apontamentos_validos_queryset()
        .select_related("tarefa", "colaborador")
        .filter(data__gte=data_inicio, data__lte=data_fim)
    )

    if proposta_ref:
        ref = proposta_ref.strip()
        qs = qs.filter(
            tarefa__tipo_etapa=TipoTarefaChoices.PROPOSTA,
            tarefa__proposta_referencia__iexact=ref,
        )
    elif ordem_producao_ref:
        ref = ordem_producao_ref.strip()
        qs = qs.filter(
            tarefa__tipo_etapa=TipoTarefaChoices.PRODUCAO,
            tarefa__ordem_producao_referencia__iexact=ref,
        )

    if colaborador_id is not None:
        qs = qs.filter(colaborador_id=colaborador_id)
    return qs


def agregar_por_colaborador(qs: QuerySet[ApontamentoHora]) -> list[dict]:
    agg_colab = (
        qs.values("colaborador_id")
        .annotate(total_horas=Sum("horas"), registros=Count("id"))
        .order_by("-total_horas")
    )
    ids_colab = [row["colaborador_id"] for row in agg_colab]
    usuarios = User.objects.in_bulk(ids_colab)
    resultado = []
    for row in agg_colab:
        uid = row["colaborador_id"]
        u = usuarios.get(uid)
        th = row["total_horas"] or Decimal("0.00")
        resultado.append(
            {
                "colaborador_id": uid,
                "colaborador_nome": _nome_usuario(u) if u else "",
                "total_horas": f"{th:.2f}",
                "registros": row["registros"],
            }
        )
    return resultado


def agregar_por_tarefa(qs: QuerySet[ApontamentoHora]) -> list[dict]:
    agg_tarefa = (
        qs.values(
            "tarefa_id",
            "tarefa__titulo",
            "tarefa__tipo_etapa",
            "tarefa__proposta_referencia",
            "tarefa__ordem_producao_referencia",
        )
        .annotate(
            total_horas=Sum("horas"),
            registros=Count("id"),
            colaboradores_distintos=Count("colaborador", distinct=True),
        )
        .order_by("-total_horas")
    )
    resultado = []
    for row in agg_tarefa:
        th = row["total_horas"] or Decimal("0.00")
        resultado.append(
            {
                "tarefa_id": str(row["tarefa_id"]),
                "titulo": row["tarefa__titulo"],
                "tipo_etapa": row["tarefa__tipo_etapa"],
                "proposta_referencia": row["tarefa__proposta_referencia"] or "",
                "ordem_producao_referencia": row["tarefa__ordem_producao_referencia"] or "",
                "total_horas": f"{th:.2f}",
                "registros": row["registros"],
                "colaboradores_distintos": row["colaboradores_distintos"],
            }
        )
    return resultado


def agregar_por_tarefa_colaborador(qs: QuerySet[ApontamentoHora]) -> list[dict]:
    agg_det = (
        qs.values("tarefa_id", "tarefa__titulo", "colaborador_id")
        .annotate(horas=Sum("horas"), registros=Count("id"))
        .order_by("tarefa__titulo", "colaborador_id")
    )
    ids_det = list({row["colaborador_id"] for row in agg_det})
    usuarios_det = User.objects.in_bulk(ids_det)
    resultado = []
    for row in agg_det:
        uid = row["colaborador_id"]
        u = usuarios_det.get(uid)
        h = row["horas"] or Decimal("0.00")
        resultado.append(
            {
                "tarefa_id": str(row["tarefa_id"]),
                "titulo": row["tarefa__titulo"],
                "colaborador_id": uid,
                "colaborador_nome": _nome_usuario(u) if u else "",
                "horas": f"{h:.2f}",
                "registros": row["registros"],
            }
        )
    return resultado


def agregar_por_proposta(qs: QuerySet[ApontamentoHora]) -> list[dict]:
    agg = (
        qs.filter(tarefa__tipo_etapa=TipoTarefaChoices.PROPOSTA)
        .exclude(tarefa__proposta_referencia__isnull=True)
        .exclude(tarefa__proposta_referencia="")
        .values("tarefa__proposta_referencia")
        .annotate(
            total_horas=Sum("horas"),
            registros=Count("id"),
            tarefas_distintas=Count("tarefa_id", distinct=True),
            colaboradores_distintos=Count("colaborador", distinct=True),
        )
        .order_by("-total_horas")
    )
    resultado = []
    for row in agg:
        th = row["total_horas"] or Decimal("0.00")
        resultado.append(
            {
                "proposta_referencia": row["tarefa__proposta_referencia"],
                "total_horas": f"{th:.2f}",
                "registros": row["registros"],
                "tarefas_distintas": row["tarefas_distintas"],
                "colaboradores_distintos": row["colaboradores_distintos"],
            }
        )
    return resultado


def agregar_por_ordem_producao(qs: QuerySet[ApontamentoHora]) -> list[dict]:
    agg = (
        qs.filter(tarefa__tipo_etapa=TipoTarefaChoices.PRODUCAO)
        .exclude(tarefa__ordem_producao_referencia__isnull=True)
        .exclude(tarefa__ordem_producao_referencia="")
        .values("tarefa__ordem_producao_referencia")
        .annotate(
            total_horas=Sum("horas"),
            registros=Count("id"),
            tarefas_distintas=Count("tarefa_id", distinct=True),
            colaboradores_distintos=Count("colaborador", distinct=True),
        )
        .order_by("-total_horas")
    )
    resultado = []
    for row in agg:
        th = row["total_horas"] or Decimal("0.00")
        resultado.append(
            {
                "ordem_producao_referencia": row["tarefa__ordem_producao_referencia"],
                "total_horas": f"{th:.2f}",
                "registros": row["registros"],
                "tarefas_distintas": row["tarefas_distintas"],
                "colaboradores_distintos": row["colaboradores_distintos"],
            }
        )
    return resultado
