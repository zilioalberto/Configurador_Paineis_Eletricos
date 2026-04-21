from django.conf import settings
from django.db import models

from core.models import BaseModel


class ProjetoEvento(BaseModel):
    projeto = models.ForeignKey(
        "projetos.Projeto",
        on_delete=models.CASCADE,
        related_name="eventos",
    )
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="projeto_eventos",
    )
    modulo = models.CharField(max_length=40)
    acao = models.CharField(max_length=60)
    descricao = models.CharField(max_length=255)
    detalhes = models.JSONField(default=dict, blank=True)

    class Meta:
        verbose_name = "Evento de projeto"
        verbose_name_plural = "Eventos de projeto"
        ordering = ["-criado_em"]
        indexes = [
            models.Index(fields=["projeto", "-criado_em"]),
            models.Index(fields=["modulo", "acao"]),
        ]

    def __str__(self):
        return f"{self.projeto_id} | {self.modulo}:{self.acao}"
