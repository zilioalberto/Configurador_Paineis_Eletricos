from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    ModoMontagemChoices,
    NumeroFaseControleSoftStarterChoices,
    ProtocoloComunicacaoChoices,
)
from .base import Produto


class EspecificacaoSoftStarter(BaseModel):
    TENSAO_220_380_CHOICES = (
        (TensaoChoices.V220, "220 V"),
        (TensaoChoices.V380, "380 V"),
    )
    PROTOCOLO_COMUNICACAO_CHOICES = (
        ("", "Sem protocolo de comunicação"),
        *ProtocoloComunicacaoChoices.choices,
    )

    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_soft_starter",
    )

    corrente_nominal_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Corrente nominal do soft starter.",
    )

    tensao_nominal_v = models.IntegerField(
        choices=TENSAO_220_380_CHOICES,
        help_text="Tensão nominal de operação.",
    )

    numero_fase_controle = models.CharField(
        max_length=2,
        choices=NumeroFaseControleSoftStarterChoices.choices,
        default=NumeroFaseControleSoftStarterChoices.F3,
        help_text="Número de fases de controle.",
    )

    protocolo_comunicacao = models.CharField(
        max_length=50,
        choices=PROTOCOLO_COMUNICACAO_CHOICES,
        blank=True,
        default="",
    )

    tipo_montagem = models.CharField(
        max_length=20,
        choices=((ModoMontagemChoices.PLACA, "Placa de montagem"),),
        default=ModoMontagemChoices.PLACA,
    )

    class Meta:
        verbose_name = "Especificação de Soft Starter"
        verbose_name_plural = "Especificações de Soft Starters"

    def __str__(self):
        return f"Soft Starter {self.corrente_nominal_a}A - {self.tensao_nominal_v}V"
