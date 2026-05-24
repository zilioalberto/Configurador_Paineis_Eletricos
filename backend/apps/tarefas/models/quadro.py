"""Quadro Kanban e colunas com status semântico (pendente, em andamento, concluído)."""

from django.conf import settings
from django.db import models

from core.models import BaseModel

from .choices import StatusSemanticoColunaChoices


class QuadroTarefa(BaseModel):
    """Quadro de tarefas (equipe operacional); contém colunas ordenadas."""

    nome = models.CharField(max_length=120)
    descricao = models.TextField(blank=True)
    equipe = models.CharField(max_length=120, blank=True)
    ativo = models.BooleanField(default=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="quadros_tarefa_criados",
    )

    class Meta:
        verbose_name = "Quadro de tarefa"
        verbose_name_plural = "Quadros de tarefas"
        ordering = ("nome",)

    def __str__(self):
        return self.nome


class ColunaTarefa(BaseModel):
    """Coluna do quadro; o status semântico sincroniza o status da tarefa."""

    quadro = models.ForeignKey(
        QuadroTarefa,
        on_delete=models.CASCADE,
        related_name="colunas",
    )
    nome = models.CharField(max_length=80)
    ordem = models.PositiveSmallIntegerField(default=0)
    status_semantico = models.CharField(
        max_length=20,
        choices=StatusSemanticoColunaChoices.choices,
        default=StatusSemanticoColunaChoices.PENDENTE,
    )
    limite_wip = models.PositiveSmallIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "Coluna de tarefa"
        verbose_name_plural = "Colunas de tarefas"
        ordering = ("quadro__nome", "ordem", "nome")
        constraints = (
            models.UniqueConstraint(
                fields=("quadro", "ordem"),
                name="tarefas_coluna_quadro_ordem_unica",
            ),
            models.UniqueConstraint(
                fields=("quadro", "nome"),
                name="tarefas_coluna_quadro_nome_unico",
            ),
        )

    def __str__(self):
        return f"{self.quadro} / {self.nome}"
