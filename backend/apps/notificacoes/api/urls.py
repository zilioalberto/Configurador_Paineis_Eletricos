from django.urls import path

from apps.notificacoes.api.views import (
    NotificacaoInternaContagemView,
    NotificacaoInternaListView,
    NotificacaoInternaMarcarLidaView,
    NotificacaoInternaMarcarTodasLidasView,
)

urlpatterns = [
    path("", NotificacaoInternaListView.as_view(), name="notificacao-interna-list"),
    path("contagem/", NotificacaoInternaContagemView.as_view(), name="notificacao-interna-contagem"),
    path(
        "marcar-todas-lidas/",
        NotificacaoInternaMarcarTodasLidasView.as_view(),
        name="notificacao-interna-marcar-todas",
    ),
    path(
        "<uuid:pk>/marcar-lida/",
        NotificacaoInternaMarcarLidaView.as_view(),
        name="notificacao-interna-marcar-lida",
    ),
]
