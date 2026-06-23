"""Configuração pública do módulo fiscal para o portal (CNPJ da empresa)."""
from django.conf import settings
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.services.sefaz.status import montar_status_sefaz_sync
from apps.fiscal.services.nfse_adn.status import montar_status_nfse_adn_sync
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
        sefaz_status = montar_status_sefaz_sync()
        nfse_adn_status = montar_status_nfse_adn_sync()
        return Response(
            {
                "cnpj_empresa": cnpj if len(cnpj) == 14 else "",
                **sefaz_status.as_api_dict(),
                **nfse_adn_status.as_api_dict(),
            }
        )
