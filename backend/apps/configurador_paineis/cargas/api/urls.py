from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.configurador_paineis.cargas.api.views import CargaModeloDetailView, CargaModeloListCreateView, CargaViewSet

router = DefaultRouter()
router.register(r"cargas", CargaViewSet, basename="cargas")
router.register(r"configurador/cargas", CargaViewSet, basename="configurador-cargas")

urlpatterns = [
    path("cargas/modelos/", CargaModeloListCreateView.as_view(), name="cargas-modelos"),
    path("cargas/modelos/<uuid:pk>/", CargaModeloDetailView.as_view(), name="cargas-modelos-detail"),
    path(
        "configurador/cargas/modelos/",
        CargaModeloListCreateView.as_view(),
        name="configurador-cargas-modelos",
    ),
    path(
        "configurador/cargas/modelos/<uuid:pk>/",
        CargaModeloDetailView.as_view(),
        name="configurador-cargas-modelos-detail",
    ),
] + router.urls
