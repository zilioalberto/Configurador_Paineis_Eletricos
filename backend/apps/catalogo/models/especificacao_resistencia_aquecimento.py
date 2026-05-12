from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    TipoMontagemResistenciaChoices,
    TipoResistenciaAquecimentoChoices,
)
from .base import Produto


class EspecificacaoResistenciaAquecimento(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_resistencia_aquecimento",
    )

    tipo_resistencia = models.CharField(
        max_length=30,
        choices=TipoResistenciaAquecimentoChoices.choices,
        help_text="Tipo construtivo da resistência de aquecimento.",
    )

    potencia_w = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        help_text="Potência térmica da resistência em watts.",
    )

    tensao_alimentacao_v = models.IntegerField(
        choices=TensaoChoices.choices,
        help_text="Tensão de alimentação da resistência.",
    )

    possui_ventilacao = models.BooleanField(
        default=False,
        help_text="Indica se possui ventilador integrado.",
    )

    tipo_montagem = models.CharField(
        max_length=30,
        choices=TipoMontagemResistenciaChoices.choices,
        blank=True,
        null=True,
    )

    corrente_nominal_a = models.DecimalField(
        max_digits=8,
        decimal_places=3,
        blank=True,
        null=True,
        help_text="Corrente nominal consumida pela resistência.",
    )

    largura_mm = models.PositiveIntegerField(blank=True, null=True)
    altura_mm = models.PositiveIntegerField(blank=True, null=True)
    profundidade_mm = models.PositiveIntegerField(blank=True, null=True)

    grau_protecao_ip = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        help_text="Grau de proteção, por exemplo IP20.",
    )

    faixa_temperatura_operacao_min_c = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
    )

    faixa_temperatura_operacao_max_c = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        blank=True,
        null=True,
    )

    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Especificação de Resistência de Aquecimento"
        verbose_name_plural = "Especificações de Resistências de Aquecimento"

    def __str__(self):
        return f"Resistência aquecimento {self.potencia_w}W - {self.tensao_alimentacao_v}V"
