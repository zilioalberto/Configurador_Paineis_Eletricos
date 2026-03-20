from django.db import models

from core.choices import TipoValvulaChoices
from .base import Carga


class CargaValvula(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="valvula",
        limit_choices_to={"tipo": "VALVULA"},
    )

    tipo_valvula = models.CharField(
        max_length=30,
        choices=TipoValvulaChoices.choices,
        default=TipoValvulaChoices.SOLENOIDE,
    )
    quantidade_vias = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    quantidade_posicoes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )
    retorno_mola = models.BooleanField(default=False)
    possui_feedback = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Especificação de Válvula"
        verbose_name_plural = "Especificações de Válvulas"

    def __str__(self):
        return f"Válvula - {self.carga.tag}"