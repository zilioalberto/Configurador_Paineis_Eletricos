"""Rotas sob o prefixo público `api/v1/erp/` (orçamentos, parâmetros, meta do roadmap)."""

from django.urls import include, path

from config.erp_meta_views import ErpModuleMetaView

urlpatterns = [
    path("modules/<slug:slug>/meta/", ErpModuleMetaView.as_view(), name="erp-module-meta"),
    path("orcamentos/", include("apps.orcamentos.api.urls")),
    path("configuracoes/", include("apps.configuracoes_erp.api.urls")),
]
