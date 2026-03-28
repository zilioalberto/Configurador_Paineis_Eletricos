from rest_framework.routers import DefaultRouter

from projetos.api.views import ProjetoViewSet

router = DefaultRouter()
router.register(r"projetos", ProjetoViewSet, basename="projetos")

urlpatterns = router.urls