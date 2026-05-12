from django.urls import path
from rest_framework.routers import DefaultRouter

from catalogo.api.views import (
    CategoriaProdutoViewSet,
    PlcFamiliasListView,
    ProdutoViewSet,
)

router = DefaultRouter()
router.register(
    r"catalogo/categorias",
    CategoriaProdutoViewSet,
    basename="catalogo-categorias",
)
router.register(r"catalogo/produtos", ProdutoViewSet, basename="catalogo-produtos")

urlpatterns = [
    path("catalogo/plc-familias/", PlcFamiliasListView.as_view(), name="catalogo-plc-familias"),
] + router.urls
