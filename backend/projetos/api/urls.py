from django.urls import path
from rest_framework.routers import DefaultRouter

from projetos.api.views import (
    DashboardResumoView,
    ProjetoAlocarCodigoView,
    ProjetoViewSet,
)

router = DefaultRouter()
router.register(r"projetos", ProjetoViewSet, basename="projetos")

urlpatterns = [
    path("dashboard/resumo/", DashboardResumoView.as_view(), name="dashboard-resumo"),
    path(
        "projetos/alocar-codigo/",
        ProjetoAlocarCodigoView.as_view(),
        name="projetos-alocar-codigo",
    ),
] + router.urls