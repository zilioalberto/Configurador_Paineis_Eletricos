from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ViewSet

from accounts.api.permissions import HasEffectivePermission
from catalogo.api.serializers import (
    NESTED_KEYS,
    ProdutoDetailSerializer,
    ProdutoListSerializer,
    ProdutoWriteSerializer,
)
from catalogo.models import (
    EspecificacaoExpansaoPLC,
    EspecificacaoModuloComunicacao,
    EspecificacaoPLC,
    Produto,
)
from core.choices.produtos import CategoriaProdutoNomeChoices, FamiliaPLCChoices
from core.permissions import PermissionKeys


class PlcFamiliasListView(APIView):
    """
    Famílias já usadas em PLC, expansões, módulos de comunicação + rótulos padrão (sugestões).
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.MATERIAL_VISUALIZAR_LISTA

    def get(self, request):
        plc_vals = (
            EspecificacaoPLC.objects.exclude(familia__isnull=True)
            .exclude(familia="")
            .values_list("familia", flat=True)
            .distinct()
        )
        exp_vals = (
            EspecificacaoExpansaoPLC.objects.exclude(familia_plc__isnull=True)
            .exclude(familia_plc="")
            .values_list("familia_plc", flat=True)
            .distinct()
        )
        mod_vals = (
            EspecificacaoModuloComunicacao.objects.exclude(familia_plc__isnull=True)
            .exclude(familia_plc="")
            .values_list("familia_plc", flat=True)
            .distinct()
        )
        padrao = [str(c.label) for c in FamiliaPLCChoices]
        merged = sorted({*plc_vals, *exp_vals, *mod_vals, *padrao}, key=str.casefold)
        return Response({"familias": merged})


class CategoriaProdutoViewSet(ViewSet):
    """Lista fixa derivada de CategoriaProdutoNomeChoices (sem tabela no banco)."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.MATERIAL_VISUALIZAR_LISTA

    def list(self, request):
        data = [
            {
                "id": value,
                "nome": value,
                "nome_display": label,
                "descricao": "",
                "ativo": True,
            }
            for value, label in CategoriaProdutoNomeChoices.choices
        ]
        return Response(data)


class ProdutoViewSet(ModelViewSet):
    queryset = Produto.objects.order_by("codigo", "descricao")
    permission_classes = [HasEffectivePermission]
    pagination_class = None

    class ProdutoPagination(PageNumberPagination):
        page_size = 50
        page_size_query_param = "page_size"
        max_page_size = 200

    def paginate_queryset(self, queryset):
        if self.action == "list":
            self.pagination_class = self.ProdutoPagination
        else:
            self.pagination_class = None
        return super().paginate_queryset(queryset)

    def get_queryset(self):
        qs = super().get_queryset()
        if self.action == "retrieve":
            qs = qs.select_related(*NESTED_KEYS)
        categoria = (self.request.query_params.get("categoria") or "").strip()
        if categoria:
            qs = qs.filter(categoria=categoria)
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(codigo__icontains=search)
                | Q(descricao__icontains=search)
                | Q(fabricante__icontains=search)
            ).filter(ativo=True)
            qs = qs.order_by("codigo", "descricao")[:40]
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ProdutoListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ProdutoWriteSerializer
        return ProdutoDetailSerializer

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.MATERIAL_VISUALIZAR_LISTA
        if self.action in ("create", "update", "partial_update", "destroy"):
            return PermissionKeys.MATERIAL_EDITAR_LISTA
        return None

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        read = ProdutoDetailSerializer(
            serializer.instance,
            context=self.get_serializer_context(),
        )
        return Response(read.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()
        read = ProdutoDetailSerializer(instance, context=self.get_serializer_context())
        return Response(read.data)
