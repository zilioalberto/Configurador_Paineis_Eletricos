from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from config.erp_registry import get_module_meta, normalize_module_slug


class ErpModuleMetaView(APIView):
    """Metadados do módulo no roadmap (sem persistência)."""

    permission_classes = [IsAuthenticated]

    def get(self, request, slug: str):
        key = normalize_module_slug(slug)
        meta = get_module_meta(key)
        if not meta:
            return Response({"detail": "Modulo desconhecido."}, status=404)
        return Response(meta)
