from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.produtos import (
    ModoMontagemChoices,
    TipoControleTemperaturaChoices,
    TipoSensorTemperaturaChoices,
    TipoSaidaControleChoices,
)
from .base import Produto


class EspecificacaoControladorTemperatura(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_controlador_temperatura",
    )

    tipo_sensor = models.CharField(
        max_length=30,
        choices=TipoSensorTemperaturaChoices.choices,
    )

    tipo_controle = models.CharField(
        max_length=20,
        choices=TipoControleTemperaturaChoices.choices,
        default=TipoControleTemperaturaChoices.PID,
    )

    tipo_saida_controle = models.CharField(
        max_length=30,
        choices=TipoSaidaControleChoices.choices,
    )

    quantidade_saidas = models.PositiveSmallIntegerField(default=1)

    possui_saida_alarme = models.BooleanField(default=False)
    quantidade_saidas_alarme = models.PositiveSmallIntegerField(default=0)

    tensao_alimentacao_v = models.IntegerField(
        choices=TensaoIluminacaoBotaoChoices.choices,
        help_text="Tensão de alimentação (24, 110 ou 220 V).",
    )

    dimensao_frontal_mm = models.CharField(
        max_length=20,
        blank=True,
        help_text="Ex: 48x48, 48x96, 96x96.",
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
        default=ModoMontagemChoices.PORTA,
    )

    class Meta:
        verbose_name = "Especificação de Controlador de Temperatura"
        verbose_name_plural = "Especificações de Controladores de Temperatura"

    def clean(self):
        super().clean()

        if self.possui_saida_alarme and self.quantidade_saidas_alarme <= 0:
            raise ValidationError(
                "Informe a quantidade de saídas de alarme."
            )

    def __str__(self):
        return (
            f"{self.produto} - {self.tipo_sensor} - "
            f"{self.tipo_saida_controle}"
        )
