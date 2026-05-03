from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    MaterialBarramentoChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
    TipoBarramentoChoices,
)
from .base import Produto


class EspecificacaoBarramento(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_barramento",
    )

    corrente_nominal_a = models.DecimalField(max_digits=10, decimal_places=2)

    material = models.CharField(
        max_length=20,
        choices=MaterialBarramentoChoices.choices,
        default=MaterialBarramentoChoices.COBRE,
    )

    tipo_barramento = models.CharField(
        max_length=40,
        choices=TipoBarramentoChoices.choices,
    )

    numero_polos = models.CharField(
        max_length=2,
        choices=NumeroPolosChoices.choices,
    )

    secao_mm2 = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    largura_mm = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    espessura_mm = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    comprimento_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    capacidade_curto_circuito_ka = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=[
            (ModoMontagemChoices.PLACA, ModoMontagemChoices.PLACA.label),
        ],
        default=ModoMontagemChoices.PLACA,
    )

    isolado = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Especificação de Barramento"
        verbose_name_plural = "Especificações de Barramentos"

    def clean(self):
        super().clean()
        self.modo_montagem = ModoMontagemChoices.PLACA
        if (
            self.largura_mm is not None
            and self.espessura_mm is not None
            and self.secao_mm2 is None
        ):
            self.secao_mm2 = self.largura_mm * self.espessura_mm

        if self.tipo_barramento == TipoBarramentoChoices.BARRA_CHATA:
            if self.secao_mm2 is None:
                raise ValidationError(
                    "Informe a seção em mm² ou as dimensões (largura × espessura) "
                    "para barramento em barra chata."
                )

    def __str__(self):
        return (
            f"{self.produto} - {self.corrente_nominal_a} A - "
            f"{self.material} - {self.numero_polos}"
        )
