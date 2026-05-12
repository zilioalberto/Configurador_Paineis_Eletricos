"""Agregações de horas apontadas para gestão (relatórios por colaborador, tarefa, proposta e OP)."""

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


def apontamentos_validos_queryset() -> QuerySet[ApontamentoHora]:
    return ApontamentoHora.objects.exclude(
        status_aprovacao__in=(
            StatusAprovacaoHoraChoices.REJEITADO,
            StatusAprovacaoHoraChoices.CANCELADO,
            StatusAprovacaoHoraChoices.REPROVADO,
        )
    )


def montar_relatorio_horas_gestao(
    *,
    data_inicio: date | None,
    data_fim: date | None,
    proposta_ref: str | None,
    ordem_producao_ref: str | None,
    colaborador_id: int | None = None,
) -> dict:
    """
    Consolida horas no período. Filtros opcionais:
    - colaborador_id: restringe aos apontamentos desse usuário.
    - proposta_ref: tarefas tipo PROPOSTA com proposta_referencia (match exato, sem espaços nas pontas).
    - ordem_producao_ref: tarefas tipo PRODUCAO com ordem_producao_referencia (match exato).
    proposta_ref e ordem_producao_ref não podem vir juntos (ValueError).
    """
    if proposta_ref and ordem_producao_ref:
        raise ValueError("Informe apenas proposta ou ordem de producao, nao ambos.")

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

    total_horas = qs.aggregate(t=Sum("horas"))["t"] or Decimal("0.00")

    # Por colaborador
    agg_colab = (
        qs.values("colaborador_id")
        .annotate(total_horas=Sum("horas"), registros=Count("id"))
        .order_by("-total_horas")
    )
    ids_colab = [row["colaborador_id"] for row in agg_colab]
    usuarios = User.objects.in_bulk(ids_colab)
    por_colaborador = []
    for row in agg_colab:
        uid = row["colaborador_id"]
        u = usuarios.get(uid)
        th = row["total_horas"] or Decimal("0.00")
        por_colaborador.append(
            {
                "colaborador_id": uid,
                "colaborador_nome": _nome_usuario(u) if u else "",
                "total_horas": f"{th:.2f}",
                "registros": row["registros"],
            }
        )

    # Por tarefa (total da tarefa, todas as pessoas)
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
    por_tarefa = []
    for row in agg_tarefa:
        th = row["total_horas"] or Decimal("0.00")
        por_tarefa.append(
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

    # Por tarefa e colaborador (detalhe individual)
    agg_det = (
        qs.values(
            "tarefa_id",
            "tarefa__titulo",
            "colaborador_id",
        )
        .annotate(horas=Sum("horas"), registros=Count("id"))
        .order_by("tarefa__titulo", "colaborador_id")
    )
    ids_det = list({row["colaborador_id"] for row in agg_det})
    usuarios_det = User.objects.in_bulk(ids_det)
    por_tarefa_colaborador = []
    for row in agg_det:
        uid = row["colaborador_id"]
        u = usuarios_det.get(uid)
        h = row["horas"] or Decimal("0.00")
        por_tarefa_colaborador.append(
            {
                "tarefa_id": str(row["tarefa_id"]),
                "titulo": row["tarefa__titulo"],
                "colaborador_id": uid,
                "colaborador_nome": _nome_usuario(u) if u else "",
                "horas": f"{h:.2f}",
                "registros": row["registros"],
            }
        )

    # Por referência de proposta (tarefas tipo PROPOSTA com referência preenchida)
    agg_proposta = (
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
    por_proposta = []
    for row in agg_proposta:
        th = row["total_horas"] or Decimal("0.00")
        por_proposta.append(
            {
                "proposta_referencia": row["tarefa__proposta_referencia"],
                "total_horas": f"{th:.2f}",
                "registros": row["registros"],
                "tarefas_distintas": row["tarefas_distintas"],
                "colaboradores_distintos": row["colaboradores_distintos"],
            }
        )

    # Por ordem de produção (tarefas tipo PRODUCAO com referência OP preenchida)
    agg_ordem = (
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
    por_ordem_producao = []
    for row in agg_ordem:
        th = row["total_horas"] or Decimal("0.00")
        por_ordem_producao.append(
            {
                "ordem_producao_referencia": row["tarefa__ordem_producao_referencia"],
                "total_horas": f"{th:.2f}",
                "registros": row["registros"],
                "tarefas_distintas": row["tarefas_distintas"],
                "colaboradores_distintos": row["colaboradores_distintos"],
            }
        )

    colab_filtro = User.objects.filter(pk=colaborador_id).first() if colaborador_id is not None else None

    return {
        "periodo": {
            "data_inicio": data_inicio.isoformat(),
            "data_fim": data_fim.isoformat(),
        },
        "filtros": {
            "proposta": proposta_ref.strip() if proposta_ref else None,
            "ordem_producao": ordem_producao_ref.strip() if ordem_producao_ref else None,
            "colaborador_id": colaborador_id,
            "colaborador_nome": _nome_usuario(colab_filtro) if colab_filtro else None,
        },
        "total_horas": f"{total_horas:.2f}",
        "por_colaborador": por_colaborador,
        "por_proposta": por_proposta,
        "por_ordem_producao": por_ordem_producao,
        "por_tarefa": por_tarefa,
        "por_tarefa_colaborador": por_tarefa_colaborador,
    }


def listar_colaboradores_com_apontamentos_no_periodo(
    *,
    data_inicio: date,
    data_fim: date,
) -> list[dict]:
    """
    Usuários distintos com ao menos um apontamento válido (não rejeitado/cancelado)
    entre data_inicio e data_fim (inclusive).
    """
    if data_inicio > data_fim:
        raise ValueError("data_inicio nao pode ser maior que data_fim.")

    ids = list(
        apontamentos_validos_queryset()
        .filter(data__gte=data_inicio, data__lte=data_fim)
        .values_list("colaborador_id", flat=True)
        .distinct()
    )
    if not ids:
        return []

    usuarios = User.objects.filter(pk__in=ids).order_by("first_name", "last_name", "email")
    return [
        {
            "id": u.id,
            "label": _nome_usuario(u) or (u.email or ""),
            "email": u.email or "",
        }
        for u in usuarios
    ]
