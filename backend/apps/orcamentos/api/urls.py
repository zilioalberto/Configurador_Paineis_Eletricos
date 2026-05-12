from django.urls import path

from apps.orcamentos.api.views import (
    ConfiguracaoMargemClienteDetailView,
    ConfiguracaoMargemClienteListCreateView,
    OrcamentoDetailView,
    OrcamentoListCreateView,
)

urlpatterns = [
    path(
        "margens-clientes/",
        ConfiguracaoMargemClienteListCreateView.as_view(),
        name="erp-orcamento-margem-cliente-list",
    ),
    path(
        "margens-clientes/<uuid:pk>/",
        ConfiguracaoMargemClienteDetailView.as_view(),
        name="erp-orcamento-margem-cliente-detail",
    ),
    path("", OrcamentoListCreateView.as_view(), name="erp-orcamento-list"),
    path("<uuid:pk>/", OrcamentoDetailView.as_view(), name="erp-orcamento-detail"),
]
