from django.db import models

from core.choices import TipoSensorChoices, TipoSinalChoices, TipoSinaisAnalogicosChoices
from .base import Carga


class CargaSensor(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="sensor",
        limit_choices_to={"tipo": "SENSOR"},
    )

    tipo_sensor = models.CharField(
        max_length=30,
        choices=TipoSensorChoices.choices,
    )
    tipo_sinal = models.CharField(
        max_length=20,
        choices=TipoSinalChoices.choices,
    )
    tipo_sinal_analogico = models.CharField(
        max_length=30,
        choices=TipoSinaisAnalogicosChoices.choices,
        null=True,
        blank=True,
    )

    pnp = models.BooleanField(default=False)
    npn = models.BooleanField(default=False)
    normalmente_aberto = models.BooleanField(default=False)
    normalmente_fechado = models.BooleanField(default=False)
    range_medicao = models.CharField(
        max_length=100,
        blank=True,
    )

    class Meta:
        verbose_name = "Especificação de Sensor"
        verbose_name_plural = "Especificações de Sensores"

    def __str__(self):
        return f"Sensor - {self.carga.tag}"