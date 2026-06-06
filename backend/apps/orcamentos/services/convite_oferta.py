"""Convites públicos para visualização e resposta da oferta."""
from __future__ import annotations

import hashlib
import json
import secrets
from datetime import timedelta

from django.utils import timezone

from apps.orcamentos.models import (
    DecisaoOfertaClienteChoices,
    Orcamento,
    OrcamentoOfertaConvite,
    OrcamentoOfertaRespostaCliente,
    OrcamentoSnapshot,
)


def _hash_snapshot(snapshot: OrcamentoSnapshot) -> str:
    payload = json.dumps(
        {"dados": snapshot.dados, "itens": snapshot.itens, "total": str(snapshot.total)},
        sort_keys=True,
        default=str,
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def convite_valido(convite: OrcamentoOfertaConvite) -> bool:
    if convite.revogado_em:
        return False
    hoje = timezone.localdate()
    return convite.valido_ate >= hoje


def obter_convite_por_token(token: str) -> OrcamentoOfertaConvite:
    convite = (
        OrcamentoOfertaConvite.objects.select_related(
            "orcamento",
            "snapshot",
        )
        .prefetch_related("resposta")
        .filter(token=token.strip())
        .first()
    )
    if not convite:
        raise ValueError("Link da oferta inválido ou expirado.")
    if not convite_valido(convite):
        raise ValueError("Este link da oferta expirou ou foi revogado.")
    return convite


def criar_convite_oferta(
    orcamento: Orcamento,
    snapshot: OrcamentoSnapshot,
    *,
    usuario=None,
) -> OrcamentoOfertaConvite:
    valido_ate = orcamento.valido_ate
    if not valido_ate:
        valido_ate = timezone.localdate() + timedelta(days=15)
    token = secrets.token_urlsafe(32)
    while OrcamentoOfertaConvite.objects.filter(token=token).exists():
        token = secrets.token_urlsafe(32)
    convite = OrcamentoOfertaConvite.objects.create(
        token=token,
        orcamento=orcamento,
        snapshot=snapshot,
        valido_ate=valido_ate,
        criado_por=usuario if getattr(usuario, "is_authenticated", False) else None,
    )
    OrcamentoOfertaRespostaCliente.objects.get_or_create(
        convite=convite,
        defaults={
            "decisao": DecisaoOfertaClienteChoices.PENDENTE,
            "hash_snapshot": _hash_snapshot(snapshot),
        },
    )
    return convite


def montar_url_convite_publico(token: str) -> str:
    from django.conf import settings

    base = (getattr(settings, "OFERTA_PUBLICA_FRONTEND_URL", "") or "").rstrip("/")
    if not base:
        base = "http://localhost:5173"
    return f"{base}/oferta-publica/{token}"
