from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    CorCanaletaChoices,
    MaterialCanaletaChoices,
    ModoMontagemChoices,
    TipoCanaletaChoices,
)
from .base import Produto


class EspecificacaoCanaleta(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_canaleta",
    )

    tipo_canaleta = models.CharField(
        max_length=20,
        choices=TipoCanaletaChoices.choices,
        default=TipoCanaletaChoices.FECHADA,
    )

    largura_mm = models.DecimalField(max_digits=8, decimal_places=2)
    altura_mm = models.DecimalField(max_digits=8, decimal_places=2)

    comprimento_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Comprimento comercial da peça, quando aplicável.",
    )

    area_util_mm2 = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Área útil interna da canaleta. Se vazio, pode ser calculada por largura x altura.",
    )

    material = models.CharField(
        max_length=20,
        choices=MaterialCanaletaChoices.choices,
        default=MaterialCanaletaChoices.PVC,
    )

    cor = models.CharField(
        max_length=20,
        choices=CorCanaletaChoices.choices,
        default=CorCanaletaChoices.CINZA,
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=[
            (ModoMontagemChoices.PLACA, ModoMontagemChoices.PLACA.label),
            (ModoMontagemChoices.PORTA, ModoMontagemChoices.PORTA.label),
        ],
        default=ModoMontagemChoices.PLACA,
    )

    class Meta:
        verbose_name = "Especificação de Canaleta"
        verbose_name_plural = "Especificações de Canaletas"

    def clean(self):
        super().clean()

        if self.largura_mm <= Decimal("0"):
            raise ValidationError("A largura da canaleta deve ser maior que zero.")

        if self.altura_mm <= Decimal("0"):
            raise ValidationError("A altura da canaleta deve ser maior que zero.")

        if self.comprimento_mm is not None and self.comprimento_mm <= Decimal("0"):
            raise ValidationError("O comprimento da canaleta deve ser maior que zero.")

        if self.area_util_mm2 is not None and self.area_util_mm2 <= Decimal("0"):
            raise ValidationError("A área útil da canaleta deve ser maior que zero.")

    def save(self, *args, **kwargs):
        if self.area_util_mm2 is None and self.largura_mm and self.altura_mm:
            self.area_util_mm2 = self.largura_mm * self.altura_mm

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.produto} - {self.largura_mm}x{self.altura_mm} mm - "
            f"{self.tipo_canaleta}"
        )
