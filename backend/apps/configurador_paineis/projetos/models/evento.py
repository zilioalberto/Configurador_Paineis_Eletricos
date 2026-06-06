"""Registro de eventos de rastreabilidade (audit trail) por projeto."""

from django.conf import settings
from django.db import models

from core.models import BaseModel


class ProjetoConfiguradorEvento(BaseModel):
    """Ação registrada no histórico do projeto (criação, edição, mudanças em módulos)."""

    projeto_configurador = models.ForeignKey(
        "projetos.ProjetoConfigurador",
        on_delete=models.CASCADE,
        related_name="eventos",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projeto_configurador_eventos",
    )
    modulo = models.CharField(max_length=40)
    acao = models.CharField(max_length=60)
    descricao = models.CharField(max_length=255)
    detalhes = models.JSONField(default=dict, blank=True)

    class Meta:
        db_table = "configurador_projeto_evento"
        verbose_name = "Evento de projeto configurador"
        verbose_name_plural = "Eventos de projeto configurador"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["projeto_configurador", "-criado_em"]),
            models.Index(fields=["modulo", "acao"]),
        ]

    def __str__(self):
        return f"{self.projeto_configurador_id} | {self.modulo}:{self.acao}"
