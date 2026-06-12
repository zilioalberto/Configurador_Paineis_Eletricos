"""API somente leitura de itens fiscais vinculados ao catálogo."""
from django.db.models import Q
from rest_framework.pagination import PageNumberPagination
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.serializers import ItemFiscalProdutoListSerializer
from apps.fiscal.models import ItemFiscalProduto
from core.permissions import PermissionKeys


class ItemFiscalPagination(PageNumberPagination):
    """Paginação padrão da listagem de itens fiscais."""

    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class ItemFiscalProdutoViewSet(ReadOnlyModelViewSet):
    """
    Lista itens fiscais ligados a produtos do catálogo (referência NF-e / tributação).
    """

    permission_classes = [HasEffectivePermission]
    pagination_class = ItemFiscalPagination
    serializer_class = ItemFiscalProdutoListSerializer

    queryset = ItemFiscalProduto.objects.select_related("produto").order_by(
        "-criado_em",
        "produto__codigo",
        "ordem",
    )

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get_queryset(self):
        qs = super().get_queryset()
        search = (self.request.query_params.get("search") or "").strip()
        if not search:
            return qs
        return qs.filter(
            Q(produto__codigo__icontains=search) | Q(produto__descricao__icontains=search)
        )
