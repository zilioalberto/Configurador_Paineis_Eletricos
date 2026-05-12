from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices
from core.choices.produtos import ModoMontagemChoices, TipoClimatizacaoChoices
from .base import Produto

TENSAO_ALIMENTACAO_CLIMATIZACAO_CHOICES = [
    (TensaoChoices.V24, TensaoChoices.V24.label),
    (TensaoChoices.V110, TensaoChoices.V110.label),
    (TensaoChoices.V220, TensaoChoices.V220.label),
    (TensaoChoices.V380, TensaoChoices.V380.label),
]


class EspecificacaoClimatizacao(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_climatizacao",
    )

    tipo_climatizacao = models.CharField(
        max_length=30,
        choices=TipoClimatizacaoChoices.choices,
    )

    capacidade_refrigeracao_w = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    capacidade_aquecimento_w = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    tensao_alimentacao_v = models.IntegerField(
        choices=TENSAO_ALIMENTACAO_CLIMATIZACAO_CHOICES
    )

    potencia_consumida_w = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )

    corrente_nominal_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    vazao_m3_h = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Vazão de ar em m³/h, aplicável a ventiladores/exaustores.",
    )

    grau_protecao_ip = models.CharField(
        max_length=10,
        blank=True,
        null=True,
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
        default=ModoMontagemChoices.PORTA,
    )

    class Meta:
        verbose_name = "Especificação de Climatização"
        verbose_name_plural = "Especificações de Climatização"

    def clean(self):
        super().clean()

        if self.tipo_climatizacao in (
            TipoClimatizacaoChoices.AR_CONDICIONADO,
            TipoClimatizacaoChoices.TROCADOR_CALOR,
        ):
            if self.capacidade_refrigeracao_w is None:
                raise ValidationError(
                    "Informe a capacidade de refrigeração para ar-condicionado ou trocador de calor."
                )

        if self.tipo_climatizacao == TipoClimatizacaoChoices.RESISTENCIA_AQUECIMENTO:
            if self.capacidade_aquecimento_w is None:
                raise ValidationError(
                    "Informe a capacidade de aquecimento para resistência de aquecimento."
                )

        if self.tipo_climatizacao in (
            TipoClimatizacaoChoices.VENTILACAO,
            TipoClimatizacaoChoices.EXAUSTOR,
        ):
            if self.vazao_m3_h is None:
                raise ValidationError(
                    "Informe a vazão de ar para ventilação ou exaustor."
                )

    def __str__(self):
        return f"{self.produto} - {self.tipo_climatizacao}"
