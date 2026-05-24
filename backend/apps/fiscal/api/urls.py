"""Rotas REST do módulo fiscal."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.fiscal.api.views import ItemFiscalProdutoViewSet

router = DefaultRouter()
router.register(
    r"fiscal/itens-fiscais",
    ItemFiscalProdutoViewSet,
    basename="fiscal-itens-fiscais",
)

urlpatterns = [
    path("", include(router.urls)),
]
