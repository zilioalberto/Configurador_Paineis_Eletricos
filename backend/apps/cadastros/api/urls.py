"""Rotas da API de cadastros (parceiros, endereços, contatos)."""

from rest_framework.routers import DefaultRouter

from apps.cadastros.api.views import (
    ContatoParceiroViewSet,
    EnderecoParceiroViewSet,
    ParceiroComercialViewSet,
)

router = DefaultRouter()
router.register(
    r"cadastros/parceiros",
    ParceiroComercialViewSet,
    basename="cadastros-parceiros",
)
router.register(
    r"cadastros/enderecos",
    EnderecoParceiroViewSet,
    basename="cadastros-enderecos",
)
router.register(
    r"cadastros/contatos",
    ContatoParceiroViewSet,
    basename="cadastros-contatos",
)

urlpatterns = router.urls
