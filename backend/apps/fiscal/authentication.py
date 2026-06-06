"""
Autenticação Bearer para agente fiscal (ponte A3 local).
Token configurado em FISCAL_AGENT_TOKEN (variável de ambiente).
"""
from __future__ import annotations

import secrets

from django.conf import settings
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.permissions import BasePermission

from apps.accounts.api.permissions import HasEffectivePermission


class FiscalAgentUser:
    """Usuário técnico representando o agente da ponte A3."""

    is_authenticated = True
    is_active = True
    is_anonymous = False

    @property
    def pk(self):
        return None


class FiscalAgentAuthentication(BaseAuthentication):
    """Valida Authorization: Bearer <FISCAL_AGENT_TOKEN>."""

    keyword = "Bearer"

    def authenticate(self, request):
        configured = (getattr(settings, "FISCAL_AGENT_TOKEN", None) or "").strip()
        if not configured:
            return None

        auth_header = request.META.get("HTTP_AUTHORIZATION", "")
        if not auth_header:
            return None

        parts = auth_header.split()
        if len(parts) != 2 or parts[0] != self.keyword:
            return None

        provided = parts[1].strip()
        if len(provided) != len(configured) or not secrets.compare_digest(
            provided, configured
        ):
            raise AuthenticationFailed("Token do agente fiscal inválido.")

        return (FiscalAgentUser(), "fiscal-agent")


class FiscalAgentTokenConfigured(BasePermission):
    """Bloqueia endpoints do agente quando FISCAL_AGENT_TOKEN não está definido."""

    message = "Autenticação do agente fiscal não configurada no servidor."

    def has_permission(self, request, view):
        return bool((getattr(settings, "FISCAL_AGENT_TOKEN", None) or "").strip())


class IsFiscalAgentAuthenticated(BasePermission):
    """Exige autenticação bem-sucedida via FiscalAgentAuthentication."""

    message = "Token do agente fiscal obrigatório."

    def has_permission(self, request, view):
        return bool(request.user and getattr(request.user, "is_authenticated", False))


class ControleNSUGetPermission(BasePermission):
    """GET do controle NSU: agente Bearer ou utilizador JWT com visualização de materiais."""

    message = "Sem permissão para consultar o controle NSU."

    def has_permission(self, request, view):
        if isinstance(request.user, FiscalAgentUser):
            return (
                FiscalAgentTokenConfigured().has_permission(request, view)
                and IsFiscalAgentAuthenticated().has_permission(request, view)
            )
        return HasEffectivePermission().has_permission(request, view)
