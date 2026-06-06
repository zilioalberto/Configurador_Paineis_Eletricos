"""Rotas da API de cadastros (parceiros, endereços, contatos)."""

from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.cadastros.api.cnpj_views import CnpjAtualizarView, CnpjConsultaView, CnpjSalvarView
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

urlpatterns = [
    path("cadastros/cnpj/<str:cnpj>/", CnpjConsultaView.as_view(), name="cadastros-cnpj-consulta"),
    path(
        "cadastros/cnpj/<str:cnpj>/salvar/",
        CnpjSalvarView.as_view(),
        name="cadastros-cnpj-salvar",
    ),
    path(
        "cadastros/cnpj/<str:cnpj>/atualizar/",
        CnpjAtualizarView.as_view(),
        name="cadastros-cnpj-atualizar",
    ),
] + router.urls
