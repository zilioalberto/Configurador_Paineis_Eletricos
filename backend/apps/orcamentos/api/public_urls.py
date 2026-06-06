from django.urls import path

from apps.orcamentos.api.public_views import (
    OfertaPublicaDetailView,
    OfertaPublicaPdfAssinadoView,
    OfertaPublicaResponderView,
)

urlpatterns = [
    path(
        "<str:token>/",
        OfertaPublicaDetailView.as_view(),
        name="oferta-publica-detail",
    ),
    path(
        "<str:token>/responder/",
        OfertaPublicaResponderView.as_view(),
        name="oferta-publica-responder",
    ),
    path(
        "<str:token>/pdf-assinado/",
        OfertaPublicaPdfAssinadoView.as_view(),
        name="oferta-publica-pdf-assinado",
    ),
]
