from __future__ import annotations

from collections.abc import Mapping

from projetos.models import Projeto, ProjetoEvento


def registrar_evento_projeto(
    *,
    projeto: Projeto,
    usuario=None,
    modulo: str,
    acao: str,
    descricao: str,
    detalhes: Mapping | None = None,
) -> ProjetoEvento:
    return ProjetoEvento.objects.create(
        projeto=projeto,
        usuario=usuario if getattr(usuario, "is_authenticated", False) else None,
        modulo=modulo,
        acao=acao,
        descricao=descricao,
        detalhes=dict(detalhes or {}),
    )
