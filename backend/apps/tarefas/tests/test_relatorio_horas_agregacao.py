"""Testes unitários de relatorio_horas_agregacao."""

from datetime import date, timedelta
from unittest.mock import patch

import pytest
from django.utils import timezone

from apps.tarefas.services import relatorio_horas_agregacao as mod


def test_resolver_periodo_relatorio_padrao_90_dias():
    hoje = date(2026, 5, 21)
    with patch.object(timezone, "localdate", return_value=hoje):
        inicio, fim = mod.resolver_periodo_relatorio(None, None)
    assert fim == hoje
    assert inicio == hoje - timedelta(days=89)


def test_resolver_periodo_relatorio_com_inicio_informado():
    inicio_in = date(2026, 1, 1)
    fim_in = date(2026, 1, 31)
    inicio, fim = mod.resolver_periodo_relatorio(inicio_in, fim_in)
    assert inicio == inicio_in
    assert fim == fim_in


def test_resolver_periodo_relatorio_inicio_maior_que_fim():
    with pytest.raises(ValueError, match="data_inicio"):
        mod.resolver_periodo_relatorio(date(2026, 6, 1), date(2026, 5, 1))


def test_queryset_apontamentos_periodo_rejeita_proposta_e_op():
    with pytest.raises(ValueError, match="apenas proposta"):
        mod.queryset_apontamentos_periodo(
            data_inicio=date(2026, 1, 1),
            data_fim=date(2026, 1, 31),
            proposta_ref="ORC-1",
            ordem_producao_ref="OP-1",
            colaborador_id=None,
        )


def test_nome_usuario_vazio_e_com_nome():
    assert mod._nome_usuario(None) == ""
    user = type("U", (), {"first_name": "Ana", "last_name": "Souza", "email": "a@t.com"})()
    assert mod._nome_usuario(user) == "Ana Souza"
    user2 = type("U", (), {"first_name": "", "last_name": "", "email": "b@t.com"})()
    assert mod._nome_usuario(user2) == "b@t.com"

