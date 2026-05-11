from django.urls import path
from rest_framework.routers import DefaultRouter

from apps.tarefas.api.views import (
    ApontamentoHoraViewSet,
    ChecklistTarefaViewSet,
    ColunaTarefaViewSet,
    ComentarioTarefaViewSet,
    HistoricoTarefaViewSet,
    KanbanTarefasView,
    QuadroPadraoTarefasView,
    QuadroTarefaViewSet,
    TarefaDashboardHorasDiaView,
    TarefaRelatorioHorasGestaoColaboradoresView,
    TarefaRelatorioHorasGestaoView,
    TarefaTimerAtivoView,
    TarefaTimerIniciarView,
    TarefaTimerPararView,
    TarefaViewSet,
    TarefaResponsavelOptionsView,
)

router = DefaultRouter()
router.register(r"tarefas/comentarios", ComentarioTarefaViewSet, basename="tarefas-comentarios")
router.register(r"tarefas/checklist", ChecklistTarefaViewSet, basename="tarefas-checklist")
router.register(r"tarefas/apontamentos", ApontamentoHoraViewSet, basename="tarefas-apontamentos")
router.register(r"tarefas/historico", HistoricoTarefaViewSet, basename="tarefas-historico")
router.register(r"tarefas/quadros", QuadroTarefaViewSet, basename="tarefas-quadros")
router.register(r"tarefas/colunas", ColunaTarefaViewSet, basename="tarefas-colunas")
router.register(r"tarefas", TarefaViewSet, basename="tarefas")

urlpatterns = [
    path("tarefas/kanban/", KanbanTarefasView.as_view(), name="tarefas-kanban"),
    path(
        "tarefas/quadros/padrao/",
        QuadroPadraoTarefasView.as_view(),
        name="tarefas-quadro-padrao",
    ),
    path(
        "tarefas/responsaveis/",
        TarefaResponsavelOptionsView.as_view(),
        name="tarefas-responsaveis",
    ),
    path(
        "tarefas/timer/ativo/",
        TarefaTimerAtivoView.as_view(),
        name="tarefas-timer-ativo",
    ),
    path(
        "tarefas/dashboard/horas-dia/",
        TarefaDashboardHorasDiaView.as_view(),
        name="tarefas-dashboard-horas-dia",
    ),
    path(
        "tarefas/relatorios/horas-gestao/colaboradores/",
        TarefaRelatorioHorasGestaoColaboradoresView.as_view(),
        name="tarefas-relatorio-horas-gestao-colaboradores",
    ),
    path(
        "tarefas/relatorios/horas-gestao/",
        TarefaRelatorioHorasGestaoView.as_view(),
        name="tarefas-relatorio-horas-gestao",
    ),
    path(
        "tarefas/<uuid:tarefa_id>/timer/iniciar/",
        TarefaTimerIniciarView.as_view(),
        name="tarefas-timer-iniciar",
    ),
    path(
        "tarefas/timer/parar/",
        TarefaTimerPararView.as_view(),
        name="tarefas-timer-parar",
    ),
] + router.urls
