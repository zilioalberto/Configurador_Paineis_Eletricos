from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.catalogo.api.nfe_import_views import (
    NfeCatalogoAplicarView,
    NfeCatalogoFornecedoresView,
    NfeCatalogoPreviewView,
    NfeCatalogoProdutoResumoView,
)
from apps.catalogo.api.views import (
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
    path(
        "catalogo/importacoes/nfe/preview/",
        NfeCatalogoPreviewView.as_view(),
        name="catalogo-nfe-preview",
    ),
    path(
        "catalogo/importacoes/nfe/fornecedores/",
        NfeCatalogoFornecedoresView.as_view(),
        name="catalogo-nfe-fornecedores",
    ),
    path(
        "catalogo/importacoes/nfe/aplicar/",
        NfeCatalogoAplicarView.as_view(),
        name="catalogo-nfe-aplicar",
    ),
    path(
        "catalogo/importacoes/nfe/produto-resumo/",
        NfeCatalogoProdutoResumoView.as_view(),
        name="catalogo-nfe-produto-resumo",
    ),
] + router.urls
