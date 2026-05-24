"""Rotas de orçamentos sob o prefixo `/erp/orcamentos/`."""
from django.urls import path

from apps.orcamentos.api.views import (
    ConfiguracaoMargemClienteDetailView,
    ConfiguracaoMargemClienteListCreateView,
    OrcamentoConfiguradorPainelListCreateView,
    OrcamentoDetailView,
    OrcamentoIniciarConfiguradorView,
    OrcamentoListCreateView,
    OrcamentoNovaRevisaoView,
    OrcamentoSincronizarComposicaoView,
    OrcamentoVincularProjetoConfiguradorView,
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
    path(
        "<uuid:pk>/nova-revisao/",
        OrcamentoNovaRevisaoView.as_view(),
        name="erp-orcamento-nova-revisao",
    ),
    path(
        "<uuid:pk>/configuradores-painel/",
        OrcamentoConfiguradorPainelListCreateView.as_view(),
        name="erp-orcamento-configuradores-painel",
    ),
    path(
        "<uuid:pk>/configuradores-painel/<uuid:vinculo_id>/iniciar-configurador/",
        OrcamentoIniciarConfiguradorView.as_view(),
        name="erp-orcamento-iniciar-configurador",
    ),
    path(
        "<uuid:pk>/configuradores-painel/<uuid:vinculo_id>/vincular-projeto/",
        OrcamentoVincularProjetoConfiguradorView.as_view(),
        name="erp-orcamento-vincular-projeto-configurador",
    ),
    path(
        "<uuid:pk>/configuradores-painel/<uuid:vinculo_id>/sincronizar-composicao/",
        OrcamentoSincronizarComposicaoView.as_view(),
        name="erp-orcamento-sincronizar-composicao",
    ),
]
