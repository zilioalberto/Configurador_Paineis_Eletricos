from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    CorCaboChoices,
    MaterialCondutorChoices,
    TipoCaboChoices,
    TipoIsolacaoCaboChoices,
)
from .base import Produto


class EspecificacaoCabo(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_cabo",
    )

    tipo_cabo = models.CharField(
        max_length=20,
        choices=TipoCaboChoices.choices,
    )

    secao_mm2 = models.DecimalField(max_digits=8, decimal_places=2)
    numero_condutores = models.PositiveSmallIntegerField(default=1)

    tensao_isolacao_v = models.PositiveIntegerField(null=True, blank=True)

    corrente_admissivel_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    material_condutor = models.CharField(
        max_length=20,
        choices=MaterialCondutorChoices.choices,
        default=MaterialCondutorChoices.COBRE,
    )

    tipo_isolacao = models.CharField(
        max_length=20,
        choices=TipoIsolacaoCaboChoices.choices,
    )

    cor = models.CharField(
        max_length=20,
        choices=CorCaboChoices.choices,
    )

    blindado = models.BooleanField(default=False)
    flexivel = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Especificação de Cabo"
        verbose_name_plural = "Especificações de Cabos"

    def __str__(self):
        return f"{self.produto} - {self.tipo_cabo} - {self.secao_mm2} mm²"
