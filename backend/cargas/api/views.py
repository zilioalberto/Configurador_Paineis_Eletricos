from rest_framework.viewsets import ModelViewSet

from accounts.api.permissions import HasEffectivePermission
from cargas.api.serializers import (
    CargaDetailSerializer,
    CargaListSerializer,
    CargaWriteSerializer,
)
from cargas.models import Carga
from core.permissions import PermissionKeys


class CargaViewSet(ModelViewSet):
    queryset = Carga.objects.select_related(
        "projeto",
        "motor",
        "valvula",
        "resistencia",
        "sensor",
        "transdutor",
    ).order_by("projeto", "tag")
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        projeto_id = self.request.query_params.get("projeto")
        if projeto_id:
            qs = qs.filter(projeto_id=projeto_id)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return CargaListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CargaWriteSerializer
        return CargaDetailSerializer

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.MATERIAL_VISUALIZAR_LISTA
        if self.action in ("create", "update", "partial_update", "destroy"):
            return PermissionKeys.MATERIAL_EDITAR_LISTA
        return None
