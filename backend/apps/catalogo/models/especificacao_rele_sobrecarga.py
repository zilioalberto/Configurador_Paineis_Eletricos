from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import ModoMontagemReleSobrecargaChoices
from .base import Produto


class EspecificacaoReleSobrecarga(BaseModel):
    """
    Alinhado ao disjuntor motor: faixa de ajuste, contatos auxiliares e modo de montagem.
    """

    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_rele_sobrecarga",
    )

    MODO_MONTAGEM_CHOICES = ModoMontagemReleSobrecargaChoices.choices

    faixa_ajuste_min_a = models.DecimalField(max_digits=8, decimal_places=2)
    faixa_ajuste_max_a = models.DecimalField(max_digits=8, decimal_places=2)

    contatos_aux_na = models.PositiveSmallIntegerField(default=0)
    contatos_aux_nf = models.PositiveSmallIntegerField(default=0)

    modo_montagem = models.CharField(
        max_length=20,
        choices=MODO_MONTAGEM_CHOICES,
    )

    class Meta:
        verbose_name = "Especificação de Relé de Sobrecarga"
        verbose_name_plural = "Especificações de Relés de Sobrecarga"

    def clean(self):
        super().clean()
        if self.faixa_ajuste_min_a > self.faixa_ajuste_max_a:
            raise ValidationError("Faixa mínima não pode ser maior que a máxima.")
        if self.modo_montagem not in {
            ModoMontagemReleSobrecargaChoices.TRILHO_DIN,
            ModoMontagemReleSobrecargaChoices.ACOPLADO_CONTATOR,
        }:
            raise ValidationError(
                {
                    "modo_montagem": (
                        "Relé de sobrecarga deve ser montado em trilho DIN "
                        "ou acoplado ao contator."
                    )
                }
            )

    def __str__(self):
        return f"Relé sobrecarga - {self.produto}"
