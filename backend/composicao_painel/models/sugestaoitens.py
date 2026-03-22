from django.db import models

from core.models import BaseModel
from core.choices import PartesPainelChoices, StatusSugestaoChoices


class SugestaoItem(BaseModel):

    projeto = models.ForeignKey(
        "projetos.Projeto",
        on_delete=models.CASCADE,
        related_name="sugestoes_itens",
    )

    produto = models.ForeignKey(
        "catalogo.Produto",
        on_delete=models.CASCADE,
        related_name="sugestoes_itens",
    )

    parte_painel = models.CharField(
        max_length=50,
        choices=PartesPainelChoices.choices,
    )

    quantidade = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
    )

    corrente_referencia_a = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    memoria_calculo = models.TextField(blank=True)
    observacoes = models.TextField(blank=True)

    status = models.CharField(
        max_length=20,
        choices=StatusSugestaoChoices.choices,
        default=StatusSugestaoChoices.PENDENTE,
    )

    ordem = models.PositiveIntegerField(default=0)

    class Meta:
        verbose_name = "Sugestão de Item"
        verbose_name_plural = "Sugestões de Itens"
        ordering = ["ordem", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["projeto", "parte_painel"],
                name="uq_sugestao_item_projeto_parte",
            )
        ]

    def __str__(self):
        return f"{self.projeto} - {self.parte_painel} - {self.produto}"