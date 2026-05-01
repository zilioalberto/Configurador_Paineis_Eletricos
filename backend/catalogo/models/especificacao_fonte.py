from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices, TipoCorrenteChoices
from core.choices.produtos import ModoMontagemChoices
from .base import Produto


class EspecificacaoFonte(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_fonte",
    )

    tensao_entrada_v = models.IntegerField(choices=TensaoChoices.choices)

    tipo_corrente_entrada = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        default=TipoCorrenteChoices.CA,
    )

    tensao_saida_v = models.IntegerField(choices=TensaoChoices.choices)

    tipo_corrente_saida = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        default=TipoCorrenteChoices.CC,
    )

    corrente_saida_a = models.DecimalField(max_digits=8, decimal_places=2)

    potencia_saida_w = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=[
            (ModoMontagemChoices.TRILHO_DIN, ModoMontagemChoices.TRILHO_DIN.label),
            (ModoMontagemChoices.PLACA, ModoMontagemChoices.PLACA.label),
        ],
        default=ModoMontagemChoices.TRILHO_DIN,
    )

    class Meta:
        verbose_name = "Especificação de Fonte"
        verbose_name_plural = "Especificações de Fontes"

    def clean(self):
        super().clean()

        if self.corrente_saida_a <= Decimal("0"):
            raise ValidationError("A corrente de saída deve ser maior que zero.")

        if self.potencia_saida_w is not None and self.potencia_saida_w <= Decimal(
            "0"
        ):
            raise ValidationError("A potência de saída deve ser maior que zero.")

    def save(self, *args, **kwargs):
        if (
            self.potencia_saida_w is None
            and self.tensao_saida_v is not None
            and self.corrente_saida_a is not None
        ):
            self.potencia_saida_w = (
                Decimal(self.tensao_saida_v) * self.corrente_saida_a
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.produto} - {self.tensao_saida_v} V "
            f"{self.corrente_saida_a} A"
        )
