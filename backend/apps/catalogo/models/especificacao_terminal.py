"""Especificação técnica de terminais vinculada ao Produto do catálogo."""

from django.core.exceptions import ValidationError
from django.db import models

from core.choices.produtos import FuroTerminalOlhalChoices, TipoTerminalChoices
from core.models import BaseModel
from .base import Produto


class EspecificacaoTerminal(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_terminal",
    )

    tipo_terminal = models.CharField(
        max_length=30,
        choices=TipoTerminalChoices.choices,
    )
    secao_min_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )
    secao_max_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )
    furo_olhal = models.CharField(
        max_length=5,
        choices=FuroTerminalOlhalChoices.choices,
        blank=True,
    )

    class Meta:
        verbose_name = "Especificação de Terminal"
        verbose_name_plural = "Especificações de Terminais"

    def clean(self):
        super().clean()

        if self.secao_min_mm2 and self.secao_min_mm2 > self.secao_max_mm2:
            raise ValidationError(
                "A seção mínima do terminal não pode ser maior que a seção máxima."
            )

        tipo_olhal = self.tipo_terminal in (
            TipoTerminalChoices.OLHAL_PRE_ISOLADO,
            TipoTerminalChoices.OLHAL_NAO_ISOLADO,
        )
        if tipo_olhal and not self.furo_olhal:
            raise ValidationError(
                {"furo_olhal": "Informe o furo para terminal olhal."}
            )
        if not tipo_olhal:
            self.furo_olhal = ""

    def __str__(self):
        furo = f" - {self.furo_olhal}" if self.furo_olhal else ""
        return (
            f"{self.produto} - {self.tipo_terminal} - "
            f"{self.secao_min_mm2} a {self.secao_max_mm2} mm²{furo}"
        )
