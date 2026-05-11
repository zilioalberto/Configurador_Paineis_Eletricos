from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.rh.api.views import (
    CargoViewSet,
    ColaboradorViewSet,
    DepartamentoViewSet,
    EquipeViewSet,
    JornadaTrabalhoViewSet,
    RhUsuariosParaVinculoView,
)

router = DefaultRouter()
router.register(r"rh/departamentos", DepartamentoViewSet, basename="rh-departamentos")
router.register(r"rh/cargos", CargoViewSet, basename="rh-cargos")
router.register(r"rh/jornadas", JornadaTrabalhoViewSet, basename="rh-jornadas")
router.register(r"rh/equipes", EquipeViewSet, basename="rh-equipes")
router.register(r"rh/colaboradores", ColaboradorViewSet, basename="rh-colaboradores")

urlpatterns = [
    path(
        "rh/colaboradores/usuarios-vinculo/",
        RhUsuariosParaVinculoView.as_view(),
        name="rh-usuarios-vinculo",
    ),
] + router.urls
