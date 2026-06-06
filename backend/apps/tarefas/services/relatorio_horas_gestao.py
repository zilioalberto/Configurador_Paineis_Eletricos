"""Agregações de horas apontadas para gestão (relatórios por colaborador, tarefa, proposta e OP)."""

from __future__ import annotations

from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.db.models import Sum

from .relatorio_horas_agregacao import (
    _nome_usuario,
    agregar_por_colaborador,
    agregar_por_ordem_producao,
    agregar_por_proposta,
    agregar_por_tarefa,
    agregar_por_tarefa_colaborador,
    apontamentos_validos_queryset,
    queryset_apontamentos_periodo,
    resolver_periodo_relatorio,
)

User = get_user_model()


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
    data_inicio, data_fim = resolver_periodo_relatorio(data_inicio, data_fim)
    qs = queryset_apontamentos_periodo(
        data_inicio=data_inicio,
        data_fim=data_fim,
        proposta_ref=proposta_ref,
        ordem_producao_ref=ordem_producao_ref,
        colaborador_id=colaborador_id,
    )

    total_horas = qs.aggregate(t=Sum("horas"))["t"] or Decimal("0.00")
    colab_filtro = (
        User.objects.filter(pk=colaborador_id).first() if colaborador_id is not None else None
    )

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
        "por_colaborador": agregar_por_colaborador(qs),
        "por_proposta": agregar_por_proposta(qs),
        "por_ordem_producao": agregar_por_ordem_producao(qs),
        "por_tarefa": agregar_por_tarefa(qs),
        "por_tarefa_colaborador": agregar_por_tarefa_colaborador(qs),
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
