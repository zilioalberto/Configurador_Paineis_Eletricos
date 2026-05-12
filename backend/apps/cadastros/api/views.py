from django.db.models import Q
from rest_framework.viewsets import ModelViewSet

from apps.accounts.api.permissions import HasEffectivePermission
from apps.cadastros.api.serializers import (
    ContatoParceiroSerializer,
    EnderecoParceiroSerializer,
    ParceiroComercialSerializer,
)
from apps.cadastros.models import ContatoParceiro, EnderecoParceiro, ParceiroComercial
from core.permissions import PermissionKeys


class ParceiroComercialViewSet(ModelViewSet):
    serializer_class = ParceiroComercialSerializer
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        qs = ParceiroComercial.objects.prefetch_related("enderecos", "contatos").order_by(
            "razao_social",
            "documento",
        )
        tipo = (self.request.query_params.get("tipo") or "").strip().lower()
        if tipo == "cliente":
            qs = qs.filter(eh_cliente=True)
        elif tipo == "fornecedor":
            qs = qs.filter(eh_fornecedor=True)
        elif tipo == "parceiro":
            qs = qs.filter(eh_parceiro=True)

        ativo = (self.request.query_params.get("ativo") or "").strip().lower()
        if ativo in ("1", "true", "yes", "on"):
            qs = qs.filter(ativo=True)
        elif ativo in ("0", "false", "no", "off"):
            qs = qs.filter(ativo=False)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(razao_social__icontains=search)
                | Q(nome_fantasia__icontains=search)
                | Q(documento__icontains=search)
                | Q(email__icontains=search)
            )
        return qs

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.CADASTRO_VISUALIZAR
        return PermissionKeys.CADASTRO_EDITAR


class EnderecoParceiroViewSet(ModelViewSet):
    serializer_class = EnderecoParceiroSerializer
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        qs = EnderecoParceiro.objects.select_related("parceiro")
        parceiro = self.request.query_params.get("parceiro")
        if parceiro:
            qs = qs.filter(parceiro_id=parceiro)
        return qs.order_by("-principal", "nome", "municipio")

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.CADASTRO_VISUALIZAR
        return PermissionKeys.CADASTRO_EDITAR


class ContatoParceiroViewSet(ModelViewSet):
    serializer_class = ContatoParceiroSerializer
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        qs = ContatoParceiro.objects.select_related("parceiro")
        parceiro = self.request.query_params.get("parceiro")
        if parceiro:
            qs = qs.filter(parceiro_id=parceiro)
        return qs.order_by("-principal", "nome")

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.CADASTRO_VISUALIZAR
        return PermissionKeys.CADASTRO_EDITAR
