from django.urls import path

<<<<<<< HEAD:backend/apps/configurador_paineis/dimensionamento/api/urls.py
from apps.configurador_paineis.dimensionamento.api.views import (
=======
from dimensionamento.api.views import (
>>>>>>> origin/main:backend/dimensionamento/api/urls.py
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
        "dimensionamento/projeto/<uuid:projeto_id>/recalcular/",
        DimensionamentoRecalcularView.as_view(),
        name="dimensionamento-recalcular",
    ),
    path(
        "dimensionamento/projeto/<uuid:projeto_id>/condutores/",
        DimensionamentoCondutoresPatchView.as_view(),
        name="dimensionamento-condutores",
    ),
]
