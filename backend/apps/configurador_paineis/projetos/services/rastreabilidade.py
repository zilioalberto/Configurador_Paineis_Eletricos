"""Serviço de rastreabilidade: grava eventos no histórico do projeto."""

from __future__ import annotations

from collections.abc import Mapping

from apps.configurador_paineis.projetos.models import Projeto, ProjetoEvento


def registrar_evento_projeto(
    *,
    projeto: Projeto,
    usuario=None,
    modulo: str,
    acao: str,
    descricao: str,
    detalhes: Mapping | None = None,
) -> ProjetoEvento:
    """Persiste um evento de audit trail vinculado ao projeto e ao usuário autenticado."""
    return ProjetoEvento.objects.create(
        projeto=projeto,
        usuario=usuario if getattr(usuario, "is_authenticated", False) else None,
        modulo=modulo,
        acao=acao,
        descricao=descricao,
        detalhes=dict(detalhes or {}),
    )
