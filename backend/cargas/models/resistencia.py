from django.db import models

from .base import Carga


class CargaResistencia(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="resistencia",
        limit_choices_to={"tipo": "RESISTENCIA"},
    )

    controle_em_etapas = models.BooleanField(default=False)
    quantidade_etapas = models.PositiveIntegerField(default=1)
    controle_pid = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Especificação de Resistência"
        verbose_name_plural = "Especificações de Resistências"

    def __str__(self):
        return f"Resistência - {self.carga.tag}"