from django.db import models
from django.core.exceptions import ValidationError

from core.models import BaseModel
from .base import Produto
from core.choices.produtos import ModoMontagemChoices


class EspecificacaoDisjuntorMotor(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_disjuntor_motor",
    )

    faixa_ajuste_min_a = models.DecimalField(max_digits=8, decimal_places=2)
    faixa_ajuste_max_a = models.DecimalField(max_digits=8, decimal_places=2)

    contatos_aux_na = models.PositiveSmallIntegerField(default=0)
    contatos_aux_nf = models.PositiveSmallIntegerField(default=0)

    modo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
    )

    class Meta:
        verbose_name = "Especificação de Disjuntor Motor"
        verbose_name_plural = "Especificações de Disjuntores Motores"

    def clean(self):
        if self.faixa_ajuste_min_a > self.faixa_ajuste_max_a:
            raise ValidationError("Faixa mínima não pode ser maior que a máxima.")

    def __str__(self):
        return f"Disjuntor Motor - {self.produto}"