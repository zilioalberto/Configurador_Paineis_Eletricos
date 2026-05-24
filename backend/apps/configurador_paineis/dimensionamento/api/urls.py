from django.urls import path

from apps.configurador_paineis.dimensionamento.api.views import (
    DimensionamentoCondutoresPatchView,
    DimensionamentoPorProjetoView,
    DimensionamentoRecalcularView,
)

urlpatterns = [
    path(
        "dimensionamento/projeto/<uuid:projeto_id>/",
        DimensionamentoPorProjetoView.as_view(),
        name="dimensionamento-por-projeto",
    ),
    path(
        "configurador/dimensionamento/projeto/<uuid:projeto_id>/",
        DimensionamentoPorProjetoView.as_view(),
        name="configurador-dimensionamento-por-projeto",
    ),
    path(
        "dimensionamento/projeto/<uuid:projeto_id>/recalcular/",
        DimensionamentoRecalcularView.as_view(),
        name="dimensionamento-recalcular",
    ),
    path(
        "configurador/dimensionamento/projeto/<uuid:projeto_id>/recalcular/",
        DimensionamentoRecalcularView.as_view(),
        name="configurador-dimensionamento-recalcular",
    ),
    path(
        "dimensionamento/projeto/<uuid:projeto_id>/condutores/",
        DimensionamentoCondutoresPatchView.as_view(),
        name="dimensionamento-condutores",
    ),
    path(
        "configurador/dimensionamento/projeto/<uuid:projeto_id>/condutores/",
        DimensionamentoCondutoresPatchView.as_view(),
        name="configurador-dimensionamento-condutores",
    ),
]
