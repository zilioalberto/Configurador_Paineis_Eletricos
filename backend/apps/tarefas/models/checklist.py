from django.conf import settings
from django.db import models
from django.utils import timezone

from core.models import BaseModel

from .tarefa import Tarefa


class ChecklistTarefa(BaseModel):
    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE, related_name="checklist")
    titulo = models.CharField(max_length=160)
    concluido = models.BooleanField(default=False)
    concluido_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="checklists_tarefa_concluidos",
    )
    concluido_em = models.DateTimeField(null=True, blank=True)
    ordem = models.PositiveSmallIntegerField(default=0)

    class Meta:
        verbose_name = "Checklist de tarefa"
        verbose_name_plural = "Checklists de tarefas"
        ordering = ("tarefa", "ordem", "titulo")

    def save(self, *args, **kwargs):
        if self.concluido and self.concluido_em is None:
            self.concluido_em = timezone.now()
        if not self.concluido:
            self.concluido_em = None
            self.concluido_por = None
        super().save(*args, **kwargs)

    def __str__(self):
        return self.titulo
