from django.urls import path
from rest_framework.routers import DefaultRouter

from cargas.api.views import CargaModeloDetailView, CargaModeloListCreateView, CargaViewSet

router = DefaultRouter()
router.register(r"cargas", CargaViewSet, basename="cargas")

urlpatterns = [
    path("cargas/modelos/", CargaModeloListCreateView.as_view(), name="cargas-modelos"),
    path("cargas/modelos/<uuid:pk>/", CargaModeloDetailView.as_view(), name="cargas-modelos-detail"),
] + router.urls
