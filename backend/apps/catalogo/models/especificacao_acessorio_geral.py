"""Especificação técnica de acessórios gerais por porte/faixa do painel."""

from django.core.exceptions import ValidationError
from django.db import models

from core.choices.produtos import (
    PortePainelAcessoriosChoices,
    TipoAcessorioGeralChoices,
)
from core.models import BaseModel
from .base import Produto


class EspecificacaoAcessorioGeral(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_acessorio_geral",
    )

    tipo_acessorio = models.CharField(
        max_length=40,
        choices=TipoAcessorioGeralChoices.choices,
        default=TipoAcessorioGeralChoices.KIT_MONTAGEM,
    )
    porte_painel = models.CharField(
        max_length=20,
        choices=PortePainelAcessoriosChoices.choices,
        default=PortePainelAcessoriosChoices.MEDIO,
    )
    largura_min_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    largura_max_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    altura_min_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    altura_max_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    profundidade_min_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    profundidade_max_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
    )
    quantidade_padrao = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=1,
    )

    class Meta:
        verbose_name = "Especificação de Acessório Geral"
        verbose_name_plural = "Especificações de Acessórios Gerais"

    def clean(self):
        super().clean()
        for campo_min, campo_max, label in (
            ("largura_min_mm", "largura_max_mm", "largura"),
            ("altura_min_mm", "altura_max_mm", "altura"),
            ("profundidade_min_mm", "profundidade_max_mm", "profundidade"),
        ):
            valor_min = getattr(self, campo_min)
            valor_max = getattr(self, campo_max)
            if valor_min is not None and valor_max is not None and valor_min > valor_max:
                raise ValidationError({campo_min: f"A {label} mínima não pode exceder a máxima."})
        if self.quantidade_padrao <= 0:
            raise ValidationError({"quantidade_padrao": "A quantidade padrão deve ser maior que zero."})

    def __str__(self):
        return f"{self.produto} - {self.tipo_acessorio} ({self.porte_painel})"
