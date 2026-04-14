from django.contrib.auth import get_user_model
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.api.permissions import IsAppAdmin
from accounts.api.serializers import (
    AdminUserCreateSerializer,
    AdminUserListSerializer,
    AdminUserUpdateSerializer,
)
from core.choices import TipoUsuarioChoices

User = get_user_model()


class UserTipoChoicesView(APIView):
    """Lista valores e rótulos de tipo_usuario para formulários de administração."""

    permission_classes = [IsAuthenticated, IsAppAdmin]

    def get(self, request):
        data = [{"value": value, "label": str(label)} for value, label in TipoUsuarioChoices.choices]
        return Response(data)


class AdminUserListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated, IsAppAdmin]
    queryset = User.objects.all().order_by("email")

    def get_serializer_class(self):
        if self.request.method == "POST":
            return AdminUserCreateSerializer
        return AdminUserListSerializer


class AdminUserRetrieveUpdateView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated, IsAppAdmin]
    queryset = User.objects.all()

    def get_serializer_class(self):
        if self.request.method == "GET":
            return AdminUserListSerializer
        return AdminUserUpdateSerializer
