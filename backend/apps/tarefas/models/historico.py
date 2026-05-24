"""Audit trail de movimentações e alterações em tarefas."""

from django.conf import settings
from django.db import models

from core.models import BaseModel

from .choices import TipoHistoricoTarefaChoices
from .quadro import ColunaTarefa
from .tarefa import Tarefa


class HistoricoTarefa(BaseModel):
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE, related_name="historico")
    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    tipo = models.CharField(max_length=20, choices=TipoHistoricoTarefaChoices.choices)
    descricao = models.CharField(max_length=255)
    dados = models.JSONField(default=dict, blank=True)
    coluna_origem = models.ForeignKey(
        ColunaTarefa,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historicos_origem",
    )
    coluna_destino = models.ForeignKey(
        ColunaTarefa,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historicos_destino",
    )
    responsavel_anterior = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historicos_responsavel_anterior",
    )
    responsavel_novo = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="historicos_responsavel_novo",
    )
    prazo_anterior = models.DateTimeField(null=True, blank=True)
    prazo_novo = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Historico de tarefa"
        verbose_name_plural = "Historicos de tarefas"
        ordering = ("-criado_em",)

    def __str__(self):
        return f"{self.tarefa} - {self.tipo}"
