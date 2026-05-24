"""
API REST de orçamentos e margens por cliente (`/erp/orcamentos/`).
"""
from rest_framework import generics

from apps.accounts.api.permissions import HasEffectivePermission
from core.permissions import PermissionKeys
from apps.orcamentos.api.serializers import (
    ConfiguracaoMargemClienteSerializer,
    OrcamentoSerializer,
)
from apps.orcamentos.models import ConfiguracaoMargemCliente, Orcamento


class OrcamentoListCreateView(generics.ListCreateAPIView):
    """Lista propostas e cria orçamento (margens do cliente aplicadas no serializer)."""

    queryset = (
        Orcamento.objects.select_related(
            "cliente",
            "contato_cliente",
            "criado_por",
            "atualizado_por",
        )
        .prefetch_related("itens")
        .all()
    )
    serializer_class = OrcamentoSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_CRIAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class OrcamentoDetailView(generics.RetrieveUpdateAPIView):
    """Detalhe e atualização com sync completo de itens quando `itens` é enviado."""

    queryset = (
        Orcamento.objects.select_related(
            "cliente",
            "contato_cliente",
            "criado_por",
            "atualizado_por",
        )
        .prefetch_related("itens")
        .all()
    )
    serializer_class = OrcamentoSerializer
    permission_classes = [HasEffectivePermission]
    lookup_field = "pk"

    def required_permission(self, request, view):
        if request.method in ("PUT", "PATCH"):
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class ConfiguracaoMargemClienteListCreateView(generics.ListCreateAPIView):
    """CRUD de margens padrão por parceiro cliente."""

    queryset = ConfiguracaoMargemCliente.objects.select_related("cliente").all()
    serializer_class = ConfiguracaoMargemClienteSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class ConfiguracaoMargemClienteDetailView(generics.RetrieveUpdateAPIView):
    """Consulta e edita margens de um cliente específico."""

    queryset = ConfiguracaoMargemCliente.objects.select_related("cliente").all()
    serializer_class = ConfiguracaoMargemClienteSerializer
    permission_classes = [HasEffectivePermission]
    lookup_field = "pk"

    def required_permission(self, request, view):
        if request.method in ("PUT", "PATCH"):
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR
