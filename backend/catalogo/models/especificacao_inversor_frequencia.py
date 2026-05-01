from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    NumeroFasesInversorFrequenciaChoices,
    ProtocoloComunicacaoChoices,
)
from .base import Produto


class EspecificacaoInversorFrequencia(BaseModel):
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
        related_name="especificacao_inversor_frequencia",
    )

    potencia_nominal_kw = models.DecimalField(max_digits=10, decimal_places=3)

    corrente_nominal_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    tensao_entrada_v = models.IntegerField(choices=TENSAO_220_380_CHOICES)

    numero_fases_entrada = models.CharField(
        max_length=2,
        choices=NumeroFasesInversorFrequenciaChoices.choices,
        default=NumeroFasesInversorFrequenciaChoices.F3,
    )

    tensao_saida_v = models.IntegerField(choices=TENSAO_220_380_CHOICES)

    protocolo_comunicacao = models.CharField(
        max_length=50,
        choices=PROTOCOLO_COMUNICACAO_CHOICES,
        blank=True,
        default="",
    )

    class Meta:
        verbose_name = "Especificação de Inversor de Frequência"
        verbose_name_plural = "Especificações de Inversores de Frequência"

    def __str__(self):
        return f"Inversor - {self.produto}"
