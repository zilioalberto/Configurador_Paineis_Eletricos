"""Rotas legadas sob o prefixo público `api/v1/erp/` (parâmetros e meta do roadmap)."""

from django.urls import include, path

from config.erp_meta_views import ErpModuleMetaView

urlpatterns = [
    path("modules/<slug:slug>/meta/", ErpModuleMetaView.as_view(), name="erp-module-meta"),
    path("configuracoes/", include("apps.configuracoes_erp.api.urls")),
]
