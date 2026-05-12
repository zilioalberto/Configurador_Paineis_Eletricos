from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    MaterialFiltroArChoices,
    ModoMontagemChoices,
    TipoFiltroArChoices,
)
from .base import Produto


class EspecificacaoFiltroAr(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_filtro_ar",
    )

    tipo_filtro = models.CharField(
        max_length=30,
        choices=TipoFiltroArChoices.choices,
    )

    vazao_nominal_m3_h = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    grau_protecao_ip = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Ex: IP54, IP55.",
    )

    material_filtro = models.CharField(
        max_length=30,
        choices=MaterialFiltroArChoices.choices,
        blank=True,
    )

    dimensao_recorte_mm = models.CharField(
        max_length=30,
        blank=True,
        help_text="Ex: 125x125 mm.",
    )

    lavavel = models.BooleanField(default=False)

    modo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
        default=ModoMontagemChoices.PORTA,
    )

    class Meta:
        verbose_name = "Especificação de Filtro de Ar"
        verbose_name_plural = "Especificações de Filtros de Ar"

    def clean(self):
        super().clean()

        if (
            self.vazao_nominal_m3_h is not None
            and self.vazao_nominal_m3_h <= Decimal("0")
        ):
            raise ValidationError("A vazão nominal deve ser maior que zero.")

    def __str__(self):
        return f"{self.produto} - {self.tipo_filtro}"
