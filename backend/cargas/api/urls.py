from rest_framework.routers import DefaultRouter

from cargas.api.views import CargaViewSet

router = DefaultRouter()
router.register(r"cargas", CargaViewSet, basename="cargas")

urlpatterns = router.urls
