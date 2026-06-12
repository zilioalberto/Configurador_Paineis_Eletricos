"""Rotas REST do módulo fiscal."""
from django.urls import include, path
from rest_framework.routers import DefaultRouter

from apps.fiscal.api.fiscal_config_views import FiscalModuloConfigView
from apps.fiscal.api.manifestacao_views import (
    ManifestacoesPendentesAgentView,
    RegistrarManifestacaoAgentView,
    SolicitarManifestacaoView,
)
from apps.fiscal.api.relatorio_faturamento_views import RelatorioFaturamentoView
from apps.fiscal.api.sefaz_sync_views import SincronizarNfesSefazView
from apps.fiscal.api.simples_views import (
    ClassificacaoDocumentoEmitidoView,
    FaturamentoMensalAjusteView,
    FaturamentoSimplesView,
    ImportarLoteDocumentosEmitidosView,
    PerfilTributarioSimplesView,
    ProjecaoDasSimplesView,
    ReclassificarDocumentosEmitidosView,
)
from apps.fiscal.api.nfe_views import (
    ControleNSUView,
    DocumentoFiscalEmitidoViewSet,
    DocumentoFiscalRecebidoViewSet,
    ImportarXMLDocumentoEmitidoPortalView,
    ImportarXMLNFePortalView,
    ImportarXMLNFeView,
    RelatorioNFeView,
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
router.register(
    r"fiscal/nfes-emitidas",
    DocumentoFiscalEmitidoViewSet,
    basename="fiscal-nfes-emitidas",
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
        "fiscal/nfes-emitidas/importar-manual/",
        ImportarXMLDocumentoEmitidoPortalView.as_view(),
        name="fiscal-nfes-emitidas-importar-manual",
    ),
    path(
        "fiscal/relatorios/nfes/",
        RelatorioNFeView.as_view(),
        name="fiscal-relatorio-nfes",
    ),
    path(
        "fiscal/relatorios/faturamento/",
        RelatorioFaturamentoView.as_view(),
        name="fiscal-relatorio-faturamento",
    ),
    path(
        "fiscal/nsu/<str:cnpj>/",
        ControleNSUView.as_view(),
        name="fiscal-nsu",
    ),
    path(
        "fiscal/nfes/sincronizar-sefaz/",
        SincronizarNfesSefazView.as_view(),
        name="fiscal-nfes-sincronizar-sefaz",
    ),
    path(
        "fiscal/nfes-emitidas/importar-lote/",
        ImportarLoteDocumentosEmitidosView.as_view(),
        name="fiscal-nfes-emitidas-importar-lote",
    ),
    path(
        "fiscal/nfes-emitidas/reclassificar/",
        ReclassificarDocumentosEmitidosView.as_view(),
        name="fiscal-nfes-emitidas-reclassificar",
    ),
    path(
        "fiscal/nfes-emitidas/<uuid:public_id>/classificacao/",
        ClassificacaoDocumentoEmitidoView.as_view(),
        name="fiscal-nfe-emitida-classificacao",
    ),
    path(
        "fiscal/simples/perfil/",
        PerfilTributarioSimplesView.as_view(),
        name="fiscal-simples-perfil",
    ),
    path(
        "fiscal/simples/faturamento/",
        FaturamentoSimplesView.as_view(),
        name="fiscal-simples-faturamento",
    ),
    path(
        "fiscal/simples/projecao-das/",
        ProjecaoDasSimplesView.as_view(),
        name="fiscal-simples-projecao-das",
    ),
    path(
        "fiscal/simples/faturamento-ajuste/",
        FaturamentoMensalAjusteView.as_view(),
        name="fiscal-simples-faturamento-ajuste",
    ),
    path("", include(router.urls)),
]
