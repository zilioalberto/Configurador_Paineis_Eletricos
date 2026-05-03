from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    CurvaDisparoMiniDisjuntorChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
)
from .base import Produto


class EspecificacaoMiniDisjuntor(BaseModel):
    MODO_MONTAGEM_CHOICES = (
        (ModoMontagemChoices.TRILHO_DIN, "Trilho DIN"),
    )

    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_minidisjuntor",
    )

    corrente_nominal_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Corrente nominal do disjuntor (ex.: 2, 6, 10, 16, 20, 32 A).",
    )
    curva_disparo = models.CharField(
        max_length=1,
        choices=CurvaDisparoMiniDisjuntorChoices.choices,
    )
    numero_polos = models.CharField(
        max_length=2,
        choices=NumeroPolosChoices.choices,
    )
    modo_montagem = models.CharField(
        max_length=20,
        choices=MODO_MONTAGEM_CHOICES,
        default=ModoMontagemChoices.TRILHO_DIN,
    )

    class Meta:
        verbose_name = "Especificação de Minidisjuntor"
        verbose_name_plural = "Especificações de Minidisjuntores"

    def clean(self):
        super().clean()
        if self.modo_montagem != ModoMontagemChoices.TRILHO_DIN:
            raise ValidationError(
                {"modo_montagem": "Minidisjuntor deve ser montado em trilho DIN."}
            )

    def __str__(self):
        return f"Minidisjuntor - {self.produto}"
