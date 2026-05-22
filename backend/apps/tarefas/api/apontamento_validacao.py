"""Validações de apontamento de horas (jornada) extraídas do serializer."""

from __future__ import annotations

from rest_framework import serializers

from core.choices import TipoUsuarioChoices
from core.permissions import PermissionKeys
from apps.tarefas.services.jornada_apontamento import (
    intervalo_horario_cabe_em_jornada,
    obter_jornada_do_usuario,
    segmentos_trabalho_no_dia,
)


def usuario_ignora_validacao_jornada(user) -> bool:
    if not user:
        return False
    if getattr(user, "is_superuser", False):
        return True
    if getattr(user, "tipo_usuario", None) == TipoUsuarioChoices.ADMIN:
        return True
    permissoes = set(getattr(user, "permissoes_efetivas", []) or [])
    return PermissionKeys.TAREFA_APONTAR_HORAS_TODAS in permissoes


def resolver_colaborador_apontamento(attrs, instance, user):
    colaborador = attrs.get("colaborador")
    if instance:
        return attrs.get("colaborador", instance.colaborador)
    if colaborador is None:
        return user
    return colaborador


def resolver_horarios_apontamento(attrs, instance):
    hi = attrs.get("hora_inicio")
    hf = attrs.get("hora_fim")
    if instance:
        if hi is None:
            hi = instance.hora_inicio
        if hf is None:
            hf = instance.hora_fim
    return hi, hf


def resolver_data_apontamento(attrs, instance):
    data_ap = attrs.get("data")
    if instance and data_ap is None:
        return instance.data
    return data_ap


def validar_jornada_apontamento(colaborador, attrs, instance) -> None:
    """Levanta ValidationError se horário/data fora da jornada do colaborador."""
    if colaborador is None:
        return

    j = obter_jornada_do_usuario(colaborador)
    if not j or not j.hora_inicio:
        return

    hi, hf = resolver_horarios_apontamento(attrs, instance)
    data_ap = resolver_data_apontamento(attrs, instance)

    if hi and hf:
        if not intervalo_horario_cabe_em_jornada(j, hi, hf):
            raise serializers.ValidationError(
                {
                    "hora_fim": (
                        "Horario fora da jornada de trabalho cadastrada para este colaborador."
                    )
                }
            )
        return

    if data_ap:
        segs = segmentos_trabalho_no_dia(j, data_ap)
        if segs == []:
            raise serializers.ValidationError(
                {
                    "data": (
                        "Data fora dos dias da jornada de trabalho deste colaborador."
                    )
                }
            )
