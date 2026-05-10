from rest_framework import generics

from apps.accounts.api.permissions import HasEffectivePermission
from core.permissions import PermissionKeys
from apps.orcamentos.api.serializers import OrcamentoSerializer
from apps.orcamentos.models import Orcamento


class OrcamentoListCreateView(generics.ListCreateAPIView):
    queryset = Orcamento.objects.prefetch_related("itens").all()
    serializer_class = OrcamentoSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_CRIAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class OrcamentoDetailView(generics.RetrieveUpdateAPIView):
    queryset = Orcamento.objects.prefetch_related("itens").all()
    serializer_class = OrcamentoSerializer
    permission_classes = [HasEffectivePermission]
    lookup_field = "pk"

    def required_permission(self, request, view):
        if request.method in ("PUT", "PATCH"):
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR
