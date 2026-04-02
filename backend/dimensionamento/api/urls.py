from django.urls import path

from dimensionamento.api.views import DimensionamentoPorProjetoView, DimensionamentoRecalcularView

urlpatterns = [
    path(
        "dimensionamento/projeto/<uuid:projeto_id>/",
        DimensionamentoPorProjetoView.as_view(),
        name="dimensionamento-por-projeto",
    ),
    path(
        "dimensionamento/projeto/<uuid:projeto_id>/recalcular/",
        DimensionamentoRecalcularView.as_view(),
        name="dimensionamento-recalcular",
    ),
]
