from rest_framework.routers import DefaultRouter

from catalogo.api.views import CategoriaProdutoViewSet, ProdutoViewSet

router = DefaultRouter()
router.register(
    r"catalogo/categorias",
    CategoriaProdutoViewSet,
    basename="catalogo-categorias",
)
router.register(r"catalogo/produtos", ProdutoViewSet, basename="catalogo-produtos")

urlpatterns = router.urls
