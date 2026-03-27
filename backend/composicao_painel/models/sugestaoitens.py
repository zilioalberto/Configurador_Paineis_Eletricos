from django.db import models
from django.db.models import Q

from core.models import BaseModel
from core.choices import (
    PartesPainelChoices,
    StatusSugestaoChoices,
    CategoriaProdutoNomeChoices,
)


class SugestaoItem(BaseModel):
    projeto = models.ForeignKey(
        "projetos.Projeto",
        on_delete=models.CASCADE,
        related_name="sugestoes_itens",
    )

    carga = models.ForeignKey(
        "cargas.Carga",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
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

    categoria_produto = models.CharField(
        max_length=50,
        choices=CategoriaProdutoNomeChoices.choices,
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
                fields=["projeto", "parte_painel", "categoria_produto"],
                condition=Q(carga__isnull=True),
                name="uq_sugestao_item_proj_parte_categoria_sem_carga",
            ),
            models.UniqueConstraint(
                fields=["projeto", "parte_painel", "categoria_produto", "carga"],
                condition=Q(carga__isnull=False),
                name="uq_sugestao_item_proj_parte_categoria_carga",
            ),
        ]

    def __str__(self):
        if self.carga:
            return (
                f"{self.projeto} - {self.parte_painel} - "
                f"{self.categoria_produto} - {self.produto} - carga {self.carga_id}"
            )
        return (
            f"{self.projeto} - {self.parte_painel} - "
            f"{self.categoria_produto} - {self.produto}"
        )