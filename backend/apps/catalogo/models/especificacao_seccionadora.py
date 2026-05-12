from django.db import models
from django.core.exceptions import ValidationError

from core.models import BaseModel
from .base import Produto
from core.choices.produtos import (
    ModoMontagemChoices,
    TipoFixacaoSeccionadoraChoices,
    CorManoplaChoices,
)


class EspecificacaoSeccionadora(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_seccionadora",
    )

    corrente_ac1_a = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    corrente_ac3_a = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    tipo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
    )

    tipo_fixacao = models.CharField(
        max_length=30,
        choices=TipoFixacaoSeccionadoraChoices.choices,
    )

    cor_manopla = models.CharField(
        max_length=30,
        choices=CorManoplaChoices.choices,
    )

    class Meta:
        verbose_name = "Especificação de Seccionadora"
        verbose_name_plural = "Especificações de Seccionadoras"

    def clean(self):
        if not self.corrente_ac1_a or not self.corrente_ac3_a:
            raise ValidationError("Informe as correntes em AC-1 ou AC-3.")

    def __str__(self):
        return f"Seccionadora - {self.produto}"