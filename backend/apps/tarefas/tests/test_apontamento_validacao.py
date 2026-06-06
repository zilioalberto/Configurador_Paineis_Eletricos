"""Testes unitários de apontamento_validacao (extraído do serializer)."""

from unittest.mock import MagicMock

import pytest
from rest_framework import serializers

from core.choices import TipoUsuarioChoices
from core.permissions import PermissionKeys
from apps.tarefas.api import apontamento_validacao as mod


def test_usuario_ignora_validacao_jornada_superuser():
    user = MagicMock(is_superuser=True, tipo_usuario=None, permissoes_efetivas=[])
    assert mod.usuario_ignora_validacao_jornada(user) is True


def test_usuario_ignora_validacao_jornada_admin():
    user = MagicMock(
        is_superuser=False,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
        permissoes_efetivas=[],
    )
    assert mod.usuario_ignora_validacao_jornada(user) is True


def test_usuario_ignora_validacao_jornada_permissao_todas():
    user = MagicMock(
        is_superuser=False,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
        permissoes_efetivas=[PermissionKeys.TAREFA_APONTAR_HORAS_TODAS],
    )
    assert mod.usuario_ignora_validacao_jornada(user) is True


def test_usuario_ignora_validacao_jornada_usuario_comum():
    user = MagicMock(
        is_superuser=False,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
        permissoes_efetivas=[],
    )
    assert mod.usuario_ignora_validacao_jornada(user) is False


def test_resolver_colaborador_apontamento_com_instance():
    colaborador = MagicMock()
    instance = MagicMock(colaborador=colaborador)
    attrs = {}
    assert mod.resolver_colaborador_apontamento(attrs, instance, None) is colaborador


def test_resolver_colaborador_apontamento_cria_com_user():
    user = MagicMock()
    assert mod.resolver_colaborador_apontamento({}, None, user) is user


def test_resolver_horarios_e_data_apontamento():
    instance = MagicMock(hora_inicio="08:00", hora_fim="12:00", data="2026-05-01")
    hi, hf = mod.resolver_horarios_apontamento({}, instance)
    assert hi == "08:00"
    assert hf == "12:00"
    assert mod.resolver_data_apontamento({}, instance) == "2026-05-01"


def test_validar_jornada_sem_colaborador_nao_levanta():
    mod.validar_jornada_apontamento(None, {}, None)


def test_validar_jornada_sem_jornada_cadastrada():
    colaborador = MagicMock()
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(mod, "obter_jornada_do_usuario", lambda _u: None)
        mod.validar_jornada_apontamento(colaborador, {"hora_inicio": "08:00", "hora_fim": "09:00"}, None)


def test_validar_jornada_intervalo_fora_da_jornada():
    colaborador = MagicMock()
    jornada = MagicMock(hora_inicio="08:00")
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(mod, "obter_jornada_do_usuario", lambda _u: jornada)
        mp.setattr(mod, "intervalo_horario_cabe_em_jornada", lambda _j, _hi, _hf: False)
        with pytest.raises(serializers.ValidationError) as exc:
            mod.validar_jornada_apontamento(
                colaborador,
                {"hora_inicio": "22:00", "hora_fim": "23:00"},
                None,
            )
    assert "hora_fim" in exc.value.detail


def test_validar_jornada_data_fora_dos_dias():
    colaborador = MagicMock()
    jornada = MagicMock(hora_inicio="08:00")
    with pytest.MonkeyPatch.context() as mp:
        mp.setattr(mod, "obter_jornada_do_usuario", lambda _u: jornada)
        mp.setattr(mod, "segmentos_trabalho_no_dia", lambda _j, _d: [])
        with pytest.raises(serializers.ValidationError) as exc:
            mod.validar_jornada_apontamento(colaborador, {"data": "2026-05-01"}, None)
    assert "data" in exc.value.detail
