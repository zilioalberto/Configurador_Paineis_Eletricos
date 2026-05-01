from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    ModoMontagemChoices,
    NumeroFasesReleEstadoSolidoChoices,
    TipoDissipadorReleEstadoSolidoChoices,
)
from .base import Produto


class EspecificacaoReleEstadoSolido(BaseModel):
    MODO_MONTAGEM_CHOICES = (
        (ModoMontagemChoices.TRILHO_DIN, "Trilho DIN"),
        (ModoMontagemChoices.PLACA, "Placa de montagem"),
    )
    TENSAO_VENTILACAO_CHOICES = (
        (TensaoChoices.V24, "24 VCC"),
        (TensaoChoices.V220, "220 VCA"),
    )

    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_rele_estado_solido",
    )

    corrente_nominal_a = models.DecimalField(max_digits=8, decimal_places=2)
    possui_dissipador = models.BooleanField(default=False)
    tipo_dissipador = models.CharField(
        max_length=20,
        choices=TipoDissipadorReleEstadoSolidoChoices.choices,
        blank=True,
        null=True,
    )
    possui_ventilacao = models.BooleanField(default=False)
    potencia_dissipada_w = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    tensao_ventilacao_v = models.IntegerField(
        choices=TENSAO_VENTILACAO_CHOICES,
        null=True,
        blank=True,
    )
    numero_fases = models.CharField(
        max_length=2,
        choices=NumeroFasesReleEstadoSolidoChoices.choices,
    )
    modo_montagem = models.CharField(
        max_length=20,
        choices=MODO_MONTAGEM_CHOICES,
    )

    class Meta:
        verbose_name = "Especificação de Relé de Estado Sólido"
        verbose_name_plural = "Especificações de Relés de Estado Sólido"

    def clean(self):
        super().clean()
        if self.possui_dissipador:
            if not self.tipo_dissipador:
                raise ValidationError(
                    "Informe o tipo de dissipador quando possui dissipador."
                )
        elif self.tipo_dissipador:
            raise ValidationError(
                "Tipo de dissipador só deve ser informado quando possui dissipador."
            )
        if self.possui_ventilacao and self.tensao_ventilacao_v is None:
            raise ValidationError(
                "Informe a tensão de ventilação quando possuir ventilação."
            )
        if not self.possui_ventilacao and self.tensao_ventilacao_v is not None:
            raise ValidationError(
                "Tensão de ventilação só deve ser informada quando possui ventilação."
            )
        if self.modo_montagem not in {
            ModoMontagemChoices.TRILHO_DIN,
            ModoMontagemChoices.PLACA,
        }:
            raise ValidationError(
                {"modo_montagem": "Relé de estado sólido deve ser montado em trilho DIN ou placa."}
            )

    def __str__(self):
        return f"Relé estado sólido - {self.produto}"
