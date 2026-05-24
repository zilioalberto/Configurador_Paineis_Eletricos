"""Serviço de rastreabilidade: grava eventos no histórico do projeto."""

from __future__ import annotations

from collections.abc import Mapping

from apps.configurador_paineis.projetos.models import ProjetoConfigurador, ProjetoConfiguradorEvento


def registrar_evento_projeto(
    *,
    projeto: ProjetoConfigurador,
    usuario=None,
    modulo: str,
    acao: str,
    descricao: str,
    detalhes: Mapping | None = None,
) -> ProjetoConfiguradorEvento:
    """Persiste um evento de audit trail vinculado ao projeto e ao usuário autenticado."""
    return ProjetoConfiguradorEvento.objects.create(
        projeto_configurador=projeto,
        usuario=usuario if getattr(usuario, "is_authenticated", False) else None,
        modulo=modulo,
        acao=acao,
        descricao=descricao,
        detalhes=dict(detalhes or {}),
    )
