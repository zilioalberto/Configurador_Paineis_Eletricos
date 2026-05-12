from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    MaterialTrilhoDINChoices,
    TipoTrilhoDINChoices,
)
from .base import Produto


class EspecificacaoTrilhoDIN(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_trilho_din",
    )

    tipo_trilho = models.CharField(
        max_length=20,
        choices=TipoTrilhoDINChoices.choices,
        default=TipoTrilhoDINChoices.TS35,
        help_text="Tipo/padrão do trilho DIN.",
    )

    comprimento_mm = models.PositiveIntegerField(
        blank=True,
        null=True,
        help_text="Comprimento da barra (ex.: 2000 mm).",
    )

    material = models.CharField(
        max_length=30,
        choices=MaterialTrilhoDINChoices.choices,
        default=MaterialTrilhoDINChoices.ACO_GALVANIZADO,
    )

    perfurado = models.BooleanField(
        default=True,
        help_text="Indica se o trilho possui furação.",
    )

    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Especificação de Trilho DIN"
        verbose_name_plural = "Especificações de Trilhos DIN"

    def __str__(self):
        comp = f"{self.comprimento_mm} mm" if self.comprimento_mm else ""
        base = f"Trilho DIN {self.get_tipo_trilho_display()}"
        return f"{base} - {comp}" if comp else base
