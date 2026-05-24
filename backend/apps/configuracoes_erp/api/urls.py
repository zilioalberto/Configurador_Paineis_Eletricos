"""Rotas de configurações ERP montadas em `/erp/configuracoes/`."""
from django.urls import path

from apps.configuracoes_erp.api.views import ParametroDetailView, ParametroListCreateView

urlpatterns = [
    path("parametros/", ParametroListCreateView.as_view(), name="erp-parametro-list"),
    path(
        "parametros/<str:chave>/",
        ParametroDetailView.as_view(),
        name="erp-parametro-detail",
    ),
]
