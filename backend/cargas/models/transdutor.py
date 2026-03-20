from django.db import models

from core.choices import TipoTransdutorChoices, TipoSinaisAnalogicosChoices
from .base import Carga


class CargaTransdutor(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="transdutor",
        limit_choices_to={"tipo": "TRANSDUTOR"},
    )

    tipo_transdutor = models.CharField(
        max_length=30,
        choices=TipoTransdutorChoices.choices,
    )
    faixa_medicao = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ex.: 0-10 bar, 0-100 °C, 0-5 m",
    )
    tipo_sinal_analogico = models.CharField(
        max_length=30,
        choices=TipoSinaisAnalogicosChoices.choices,
        null=True,
        blank=True,
    )
    precisao = models.CharField(
        max_length=50,
        blank=True,
    )

    class Meta:
        verbose_name = "Especificação de Transdutor"
        verbose_name_plural = "Especificações de Transdutores"

    def __str__(self):
        return f"Transdutor - {self.carga.tag}"