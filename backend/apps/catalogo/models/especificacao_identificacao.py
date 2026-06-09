"""Especificação técnica de itens de identificação vinculada ao Produto."""

from django.core.exceptions import ValidationError
from django.db import models

from core.choices.produtos import (
    TamanhoPlaquetaIdentificacaoChoices,
    TipoIdentificacaoChoices,
)
from core.models import BaseModel
from .base import Produto


class EspecificacaoIdentificacao(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_identificacao",
    )

    tipo_identificacao = models.CharField(
        max_length=40,
        choices=TipoIdentificacaoChoices.choices,
    )

    secao_min_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    secao_max_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    diametro_min_mm = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    diametro_max_mm = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    comprimento_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    tamanho_plaqueta = models.CharField(
        max_length=10,
        choices=TamanhoPlaquetaIdentificacaoChoices.choices,
        blank=True,
    )
    tensao_v = models.PositiveIntegerField(null=True, blank=True)

    class Meta:
        verbose_name = "Especificação de Identificação"
        verbose_name_plural = "Especificações de Identificação"

    def clean(self):
        super().clean()

        if self.secao_min_mm2 and self.secao_max_mm2 and self.secao_min_mm2 > self.secao_max_mm2:
            raise ValidationError("A seção mínima não pode ser maior que a seção máxima.")
        if (
            self.diametro_min_mm
            and self.diametro_max_mm
            and self.diametro_min_mm > self.diametro_max_mm
        ):
            raise ValidationError("O diâmetro mínimo não pode ser maior que o diâmetro máximo.")

        if self.tipo_identificacao != TipoIdentificacaoChoices.PLAQUETA_IDENTIFICACAO:
            self.tamanho_plaqueta = ""
        elif not self.tamanho_plaqueta:
            raise ValidationError({"tamanho_plaqueta": "Informe o tamanho da plaqueta."})

        if self.tipo_identificacao != TipoIdentificacaoChoices.FAIXA_IDENTIFICACAO:
            self.comprimento_mm = None
        elif self.comprimento_mm is None:
            raise ValidationError({"comprimento_mm": "Informe o comprimento da faixa."})

        if self.tipo_identificacao != TipoIdentificacaoChoices.ADESIVO_TENSAO:
            self.tensao_v = None

        if self.tipo_identificacao != TipoIdentificacaoChoices.SUPORTE_LUVA_CABO:
            self.secao_min_mm2 = None
            self.secao_max_mm2 = None
            self.diametro_min_mm = None
            self.diametro_max_mm = None

    def __str__(self):
        return f"{self.produto} - {self.tipo_identificacao}"
