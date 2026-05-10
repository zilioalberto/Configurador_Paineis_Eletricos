from django.urls import path

from apps.orcamentos.api.views import OrcamentoDetailView, OrcamentoListCreateView

urlpatterns = [
    path("", OrcamentoListCreateView.as_view(), name="erp-orcamento-list"),
    path("<uuid:pk>/", OrcamentoDetailView.as_view(), name="erp-orcamento-detail"),
]
