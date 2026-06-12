"""Modelo base do catálogo: produto comercial e dados fiscais de referência."""

import re

from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from apps.cadastros.models import ParceiroComercial
from core.models import BaseModel
from core.choices.fiscal import OrigemMercadoriaICMSChoices
from core.choices.produtos import CategoriaProdutoNomeChoices, UnidadeMedidaChoices

from core.models.mixins import (
    DimensoesMixin,
    AtivacaoMixin,
    ObservacoesTecnicasMixin,
    UpperCaseMixin,
)


def _somente_digitos(valor: str, nome: str, tamanho: int) -> None:
    if not valor:
        return
    if not re.fullmatch(rf"\d{{{tamanho}}}", valor):
        raise ValidationError({nome: f"{nome.upper()} deve conter exatamente {tamanho} dígitos."})


class Produto(
    BaseModel,
    UpperCaseMixin,
    DimensoesMixin,
    AtivacaoMixin,
    ObservacoesTecnicasMixin,
):
    """Item do catálogo técnico; categoria define a especificação 1:1 associada."""

    UPPERCASE_FIELDS = [
        "codigo",
        "descricao",
        "referencia_fabricante",
        "unidade_medida",
        "categoria",
        "observacoes_tecnicas",
    ]

    codigo = models.CharField(max_length=60, unique=True)
    descricao = models.CharField(max_length=255)
    referencia_fabricante = models.CharField(max_length=120, blank=True)

    categoria = models.CharField(
        max_length=50,
        choices=CategoriaProdutoNomeChoices.choices,
        db_index=True,
    )

    unidade_medida = models.CharField(
        max_length=10,
        choices=UnidadeMedidaChoices.choices,
        default=UnidadeMedidaChoices.UN,
    )

    preco_base = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Preço de referência (lista). Tabelas por cliente/região ficam fora do catálogo.",
    )
    preco_atualizado_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data da última revisão comercial do preço de referência.",
    )
    fabricante_parceiro = models.ForeignKey(
        ParceiroComercial,
        on_delete=models.PROTECT,
        related_name="produtos_fabricados_catalogo",
        null=True,
        blank=True,
        limit_choices_to={"eh_fornecedor": True, "ativo": True},
    )
    fornecedor_parceiro = models.ForeignKey(
        ParceiroComercial,
        on_delete=models.PROTECT,
        related_name="produtos_fornecidos_catalogo",
        null=True,
        blank=True,
        limit_choices_to={"eh_fornecedor": True, "ativo": True},
    )

    # Referência NF-e / orçamento (CFOP, CST e alíquotas ficam no contexto da operação)
    gtin = models.CharField(
        "GTIN / EAN (cEAN)",
        max_length=14,
        blank=True,
        help_text="Código de barras comercial (ex.: EAN-13). Opcional.",
    )
    ncm = models.CharField(
        "NCM",
        max_length=8,
        blank=True,
        db_index=True,
        help_text="Nomenclatura comum do Mercosul (8 dígitos), sem pontos.",
    )
    cest = models.CharField(
        "CEST",
        max_length=7,
        blank=True,
        help_text="Código CEST (7 dígitos), quando aplicável à substituição tributária.",
    )
    origem_mercadoria = models.CharField(
        "Origem da mercadoria (ICMS)",
        max_length=1,
        choices=OrigemMercadoriaICMSChoices.choices,
        default=OrigemMercadoriaICMSChoices.NACIONAL,
    )
    unidade_tributavel = models.CharField(
        "Unidade tributável (uTrib)",
        max_length=10,
        choices=UnidadeMedidaChoices.choices,
        blank=True,
        help_text="Se vazio, usar a unidade comercial do produto (uCom).",
    )
    codigo_perfil_fiscal = models.CharField(
        "Código do perfil / grupo fiscal",
        max_length=30,
        blank=True,
        help_text="Referência a regras de tributação (implementação futura).",
    )
    peso_liquido_kg = models.DecimalField(
        "Peso líquido (kg)",
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
    )
    peso_bruto_kg = models.DecimalField(
        "Peso bruto (kg)",
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
    )

    class Meta:
        verbose_name = "Produto"
        verbose_name_plural = "Produtos"
        ordering = ["codigo", "descricao"]

    def __str__(self):
        return f"{self.codigo} - {self.descricao}"

    def save(self, *args, **kwargs):
        preco_mudou = self._state.adding
        if not self._state.adding and self.pk:
            preco_anterior = (
                type(self).objects.filter(pk=self.pk).values_list("preco_base", flat=True).first()
            )
            preco_mudou = preco_anterior != self.preco_base
        if preco_mudou:
            self.preco_atualizado_em = timezone.now()
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = set(update_fields) | {"preco_atualizado_em"}
        super().save(*args, **kwargs)

    def clean(self):
        super().clean()
        _somente_digitos(self.ncm, "ncm", 8)
        _somente_digitos(self.cest, "cest", 7)
        if self.gtin and not re.fullmatch(r"\d{8,14}", self.gtin):
            raise ValidationError(
                {"gtin": "GTIN deve conter apenas dígitos e ter entre 8 e 14 posições."}
            )
