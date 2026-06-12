"""Configuração pública do módulo fiscal para o portal (CNPJ da empresa)."""
from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.utils import normalizar_cnpj
from core.permissions import PermissionKeys


class FiscalModuloConfigView(APIView):
    """Metadados operacionais (CNPJ, certificado A1 / sincronização SEFAZ)."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get(self, request):
        raw = (getattr(settings, "FISCAL_EMPRESA_CNPJ", None) or "").strip()
        cnpj = normalizar_cnpj(raw) if raw else ""
        cert_path = (getattr(settings, "FISCAL_CERT_PATH", None) or "").strip()
        provider = (getattr(settings, "FISCAL_SEFAZ_PROVIDER", "native") or "native").lower()
        sefaz_sync_configurado = bool(
            cnpj
            and (
                provider in {"stub", "homolog"}
                or (cert_path and (getattr(settings, "FISCAL_CERT_PASSWORD", None) or "").strip())
            )
        )
        agente_legado = bool((getattr(settings, "FISCAL_AGENT_TOKEN", None) or "").strip())
        return Response(
            {
                "cnpj_empresa": cnpj if len(cnpj) == 14 else "",
                "sefaz_sync_configurado": sefaz_sync_configurado,
                "agente_ponte_configurado": sefaz_sync_configurado or agente_legado,
            }
        )
