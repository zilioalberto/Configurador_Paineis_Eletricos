from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    ModoMontagemChoices,
    TipoBorneChoices,
    TipoConexaoBorneChoices,
)
from .base import Produto


class EspecificacaoBorne(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_borne",
    )

    tipo_borne = models.CharField(
        max_length=20,
        choices=TipoBorneChoices.choices,
    )

    tipo_conexao = models.CharField(
        max_length=20,
        choices=TipoConexaoBorneChoices.choices,
        default=TipoConexaoBorneChoices.PARAFUSO,
    )

    secao_min_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    secao_max_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
    )

    corrente_nominal_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    numero_niveis = models.PositiveSmallIntegerField(default=1)

    possui_fusivel = models.BooleanField(default=False)

    modo_montagem = models.CharField(
        max_length=20,
        choices=[
            (ModoMontagemChoices.TRILHO_DIN, ModoMontagemChoices.TRILHO_DIN.label),
            (ModoMontagemChoices.PLACA, ModoMontagemChoices.PLACA.label),
        ],
        default=ModoMontagemChoices.TRILHO_DIN,
    )

    class Meta:
        verbose_name = "Especificação de Borne"
        verbose_name_plural = "Especificações de Bornes"

    def clean(self):
        super().clean()

        if self.secao_min_mm2 and self.secao_min_mm2 > self.secao_max_mm2:
            raise ValidationError(
                "A seção mínima do borne não pode ser maior que a seção máxima."
            )

        if self.tipo_borne == TipoBorneChoices.FUSIVEL and not self.possui_fusivel:
            self.possui_fusivel = True

    def __str__(self):
        return f"{self.produto} - {self.tipo_borne} - {self.secao_max_mm2} mm²"
