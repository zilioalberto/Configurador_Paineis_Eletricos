from django.db import models
from django.db.models import Q

from core.models import BaseModel
from core.choices import (
    PartesPainelChoices,
    StatusPendenciaChoices,
    CategoriaProdutoNomeChoices,
)


class PendenciaItem(BaseModel):
    projeto = models.ForeignKey(
        "projetos.Projeto",
        on_delete=models.CASCADE,
        related_name="pendencias_itens",
    )

    carga = models.ForeignKey(
        "cargas.Carga",
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="pendencias_itens",
    )

    parte_painel = models.CharField(
        max_length=50,
        choices=PartesPainelChoices.choices,
    )

    categoria_produto = models.CharField(
        max_length=50,
        choices=CategoriaProdutoNomeChoices.choices,
    )

    corrente_referencia_a = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    descricao = models.TextField()
    memoria_calculo = models.TextField(blank=True)
    observacoes = models.TextField(blank=True)

    status = models.CharField(
        max_length=30,
        choices=StatusPendenciaChoices.choices,
        default=StatusPendenciaChoices.ABERTA,
    )

    ordem = models.PositiveIntegerField(default=0)

    indice_escopo = models.PositiveSmallIntegerField(
        default=0,
        help_text="Índice para múltiplas pendências do mesmo escopo (ex.: contatoras Y-Δ).",
    )

    class Meta:
        verbose_name = "Pendência de Item"
        verbose_name_plural = "Pendências de Itens"
        ordering = ["ordem", "id"]
        constraints = [
            models.UniqueConstraint(
                fields=["projeto", "parte_painel", "categoria_produto"],
                condition=Q(carga__isnull=True),
                name="uq_pendencia_item_proj_parte_categoria_sem_carga",
            ),
            models.UniqueConstraint(
                fields=[
                    "projeto",
                    "parte_painel",
                    "categoria_produto",
                    "carga",
                    "indice_escopo",
                ],
                condition=Q(carga__isnull=False),
                name="uq_pendencia_item_proj_parte_categoria_carga_escopo",
            ),
        ]

    def __str__(self):
        if self.carga:
            return (
                f"{self.projeto} - {self.parte_painel} - "
                f"{self.categoria_produto} - carga {self.carga_id}"
            )
        return (
            f"{self.projeto} - {self.parte_painel} - "
            f"{self.categoria_produto} - pendência"
        )