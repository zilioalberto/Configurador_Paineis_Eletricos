from django.db import models
from core.models import BaseModel
from core.choices.paineis import PartesPainelChoices


class ConjuntoPainel(BaseModel):
   
    projeto = models.ForeignKey(
        "projetos.Projeto",
        on_delete=models.CASCADE,
        related_name="conjuntos_painel",
    )
    nome = models.CharField(max_length=50, choices=PartesPainelChoices.choices)
    descricao = models.CharField(max_length=255, blank=True)
    ordem = models.PositiveIntegerField(default=0)
    observacoes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Conjunto do Painel"
        verbose_name_plural = "Conjuntos do Painel"
        ordering = ["ordem", "id"]
        unique_together = [("projeto", "nome")]