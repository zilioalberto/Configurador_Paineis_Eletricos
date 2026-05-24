from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.configurador_paineis.projetos.api.views import (
    DashboardResumoView,
    ProjetoAlocarCodigoView,
    ProjetoResponsavelOptionsView,
    ProjetoViewSet,
)

router = DefaultRouter()
router.register(r"projetos", ProjetoViewSet, basename="projetos")
router.register(
    r"configurador/configuracoes",
    ProjetoViewSet,
    basename="configurador-configuracoes",
)

urlpatterns = [
    path("dashboard/resumo/", DashboardResumoView.as_view(), name="dashboard-resumo"),
    path(
        "configurador/dashboard/resumo/",
        DashboardResumoView.as_view(),
        name="configurador-dashboard-resumo",
    ),
    path(
        "projetos/alocar-codigo/",
        ProjetoAlocarCodigoView.as_view(),
        name="projetos-alocar-codigo",
    ),
    path(
        "configurador/configuracoes/alocar-codigo/",
        ProjetoAlocarCodigoView.as_view(),
        name="configurador-configuracoes-alocar-codigo",
    ),
    path(
        "projetos/responsaveis/",
        ProjetoResponsavelOptionsView.as_view(),
        name="projetos-responsaveis",
    ),
    path(
        "configurador/configuracoes/responsaveis/",
        ProjetoResponsavelOptionsView.as_view(),
        name="configurador-configuracoes-responsaveis",
    ),
] + router.urls
