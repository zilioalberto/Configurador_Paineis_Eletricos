"""
API de administração de utilizadores (CRUD e metadados de tipos/permissões).

Rotas sob `/auth/`; acesso restrito a administradores da aplicação (`IsAppAdmin`).
"""
from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import IsAppAdmin
from apps.accounts.api.serializers import (
    AdminUserCreateSerializer,
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
)
from core.choices import (
    DEFAULT_PERMISSIONS_BY_TIPO,
    PermissaoUsuarioChoices,
    TipoUsuarioChoices,
)

User = get_user_model()


class UserTipoChoicesView(APIView):
    """Lista valores e rótulos de tipo_usuario para formulários de administração."""

    permission_classes = [IsAuthenticated, IsAppAdmin]

    def get(self, request):
        data = [{"value": value, "label": str(label)} for value, label in TipoUsuarioChoices.choices]
        return Response(data)


class UserPermissionOptionsView(APIView):
    """Catálogo de permissões e permissões padrão por tipo de utilizador."""

    permission_classes = [IsAuthenticated, IsAppAdmin]

    def get(self, request):
        permissions = [
            {"value": value, "label": str(label)}
            for value, label in PermissaoUsuarioChoices.choices
        ]
        defaults = {
            tipo: sorted(values)
            for tipo, values in DEFAULT_PERMISSIONS_BY_TIPO.items()
        }
        return Response({"permissions": permissions, "defaults_by_tipo": defaults})


class AdminUserListCreateView(generics.ListCreateAPIView):
    """Lista utilizadores (com vínculo RH) e cria conta com permissões calculadas."""

    permission_classes = [IsAuthenticated, IsAppAdmin]

    def get_queryset(self):
        return User.objects.all().select_related("colaborador_rh").order_by("email")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminUserCreateSerializer
        return AdminUserListSerializer


class AdminUserRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    """Detalhe e atualização de utilizador (inclui recálculo de extras/negadas)."""

    permission_classes = [IsAuthenticated, IsAppAdmin]

    def get_queryset(self):
        return User.objects.all().select_related("colaborador_rh")

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AdminUserListSerializer
        return AdminUserUpdateSerializer
