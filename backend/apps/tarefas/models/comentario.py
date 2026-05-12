from django.conf import settings
from django.db import models

from core.models import BaseModel

from .tarefa import Tarefa


class ComentarioTarefa(BaseModel):
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE, related_name="comentarios")
    autor = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True)
    comentario = models.TextField()

    class Meta:
        verbose_name = "Comentario de tarefa"
        verbose_name_plural = "Comentarios de tarefas"
        ordering = ("criado_em",)

    def __str__(self):
        return f"Comentario em {self.tarefa}"
