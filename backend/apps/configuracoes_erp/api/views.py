from rest_framework import generics

from apps.accounts.api.permissions import HasEffectivePermission
from apps.configuracoes_erp.api.serializers import ParametroConfiguracaoSerializer
from apps.configuracoes_erp.models import ParametroConfiguracao
from core.permissions import PermissionKeys


class ParametroListCreateView(generics.ListCreateAPIView):
    queryset = ParametroConfiguracao.objects.all()
    serializer_class = ParametroConfiguracaoSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.CONFIGURACAO_ERP_GERENCIAR
        return PermissionKeys.CONFIGURACAO_ERP_VISUALIZAR


class ParametroDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ParametroConfiguracao.objects.all()
    serializer_class = ParametroConfiguracaoSerializer
    permission_classes = [HasEffectivePermission]
    lookup_field = "chave"

    def required_permission(self, request, view):
        if request.method in ("PUT", "PATCH", "DELETE"):
            return PermissionKeys.CONFIGURACAO_ERP_GERENCIAR
        return PermissionKeys.CONFIGURACAO_ERP_VISUALIZAR
