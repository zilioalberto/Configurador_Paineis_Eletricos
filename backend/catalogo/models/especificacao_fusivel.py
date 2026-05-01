from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    FusivelCartuchoTamanhoChoices,
    FusivelNHTamanhoChoices,
    FormatoFusivelChoices,
    TipoFusivelChoices,
)
from .base import Produto


class EspecificacaoFusivel(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_fusivel",
    )

    tipo_fusivel = models.CharField(
        max_length=20,
        choices=TipoFusivelChoices.choices,
    )

    formato = models.CharField(
        max_length=20,
        choices=FormatoFusivelChoices.choices,
    )

    tamanho = models.CharField(
        max_length=20,
        blank=True,
        help_text="Ex: NH00, NH1, 10x38, 14x51.",
    )

    corrente_nominal_a = models.DecimalField(max_digits=8, decimal_places=2)

    indicador_queima = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Especificação de Fusível"
        verbose_name_plural = "Especificações de Fusíveis"

    def clean(self):
        super().clean()

        if self.corrente_nominal_a <= Decimal("0"):
            raise ValidationError("A corrente do fusível deve ser maior que zero.")

        if not self.tamanho:
            raise ValidationError({"tamanho": "Informe o tamanho do fusível."})

        tamanhos_validos_nh = {v for v, _ in FusivelNHTamanhoChoices.choices}
        tamanhos_validos_cartucho = {v for v, _ in FusivelCartuchoTamanhoChoices.choices}
        if self.formato == FormatoFusivelChoices.NH and self.tamanho not in tamanhos_validos_nh:
            raise ValidationError(
                {"tamanho": "Para formato NH, informe um tamanho NH válido (ex.: NH00, NH1)."}
            )
        if (
            self.formato == FormatoFusivelChoices.CARTUCHO
            and self.tamanho not in tamanhos_validos_cartucho
        ):
            raise ValidationError(
                {"tamanho": "Para formato cartucho, informe um tamanho válido (ex.: 10x38)."}
            )

    def __str__(self):
        return f"{self.produto} - {self.formato} {self.tamanho} - {self.corrente_nominal_a} A"
