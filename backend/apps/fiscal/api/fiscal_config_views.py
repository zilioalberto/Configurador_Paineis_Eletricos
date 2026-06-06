"""Configuração pública do módulo fiscal para o portal (CNPJ da empresa)."""
from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.utils import normalizar_cnpj
from core.permissions import PermissionKeys


class FiscalModuloConfigView(APIView):
    """Metadados operacionais (CNPJ para NSU / ponte A3)."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_VISUALIZAR_LISTA

    def get(self, request):
        raw = (getattr(settings, "FISCAL_EMPRESA_CNPJ", None) or "").strip()
        cnpj = normalizar_cnpj(raw) if raw else ""
        agente_configurado = bool(
            (getattr(settings, "FISCAL_AGENT_TOKEN", None) or "").strip()
        )
        return Response(
            {
                "cnpj_empresa": cnpj if len(cnpj) == 14 else "",
                "agente_ponte_configurado": agente_configurado,
            }
        )
