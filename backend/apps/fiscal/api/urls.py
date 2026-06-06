"""Rotas REST do módulo fiscal."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.fiscal.api.fiscal_config_views import FiscalModuloConfigView
from apps.fiscal.api.manifestacao_views import (
    ManifestacoesPendentesAgentView,
    RegistrarManifestacaoAgentView,
    SolicitarManifestacaoView,
)
from apps.fiscal.api.nfe_views import (
    ControleNSUView,
    DocumentoFiscalRecebidoViewSet,
    ImportarXMLNFePortalView,
    ImportarXMLNFeView,
)
from apps.fiscal.api.views import ItemFiscalProdutoViewSet

router = DefaultRouter()
router.register(
    r"fiscal/itens-fiscais",
    ItemFiscalProdutoViewSet,
    basename="fiscal-itens-fiscais",
)
router.register(
    r"fiscal/nfes",
    DocumentoFiscalRecebidoViewSet,
    basename="fiscal-nfes",
)

urlpatterns = [
    path(
        "fiscal/config/",
        FiscalModuloConfigView.as_view(),
        name="fiscal-config",
    ),
    path(
        "fiscal/nfes/manifestacoes-pendentes/",
        ManifestacoesPendentesAgentView.as_view(),
        name="fiscal-nfes-manifestacoes-pendentes",
    ),
    path(
        "fiscal/nfes/<int:documento_id>/solicitar-manifestacao/",
        SolicitarManifestacaoView.as_view(),
        name="fiscal-nfe-solicitar-manifestacao",
    ),
    path(
        "fiscal/nfes/<int:documento_id>/registrar-manifestacao/",
        RegistrarManifestacaoAgentView.as_view(),
        name="fiscal-nfe-registrar-manifestacao",
    ),
    path(
        "fiscal/nfes/importar-xml/",
        ImportarXMLNFeView.as_view(),
        name="fiscal-nfes-importar-xml",
    ),
    path(
        "fiscal/nfes/importar-manual/",
        ImportarXMLNFePortalView.as_view(),
        name="fiscal-nfes-importar-manual",
    ),
    path(
        "fiscal/nsu/<str:cnpj>/",
        ControleNSUView.as_view(),
        name="fiscal-nsu",
    ),
    path("", include(router.urls)),
]
