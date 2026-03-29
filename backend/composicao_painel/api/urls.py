from django.urls import path

from composicao_painel.api.views import (
    ComposicaoGerarSugestoesView,
    ComposicaoProjetoSnapshotView,
    SugestaoAlternativasView,
    SugestaoAprovarView,
)

urlpatterns = [
    path(
        "composicao/projeto/<uuid:projeto_id>/",
        ComposicaoProjetoSnapshotView.as_view(),
        name="composicao-projeto-snapshot",
    ),
    path(
        "composicao/projeto/<uuid:projeto_id>/gerar-sugestoes/",
        ComposicaoGerarSugestoesView.as_view(),
        name="composicao-projeto-gerar-sugestoes",
    ),
    path(
        "composicao/sugestoes/<uuid:sugestao_id>/alternativas/",
        SugestaoAlternativasView.as_view(),
        name="composicao-sugestao-alternativas",
    ),
    path(
        "composicao/sugestoes/<uuid:sugestao_id>/aprovar/",
        SugestaoAprovarView.as_view(),
        name="composicao-sugestao-aprovar",
    ),
]
