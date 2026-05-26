"""Catálogo de serviços prestados (propostas comerciais)."""

from django.db import models

from core.models import BaseModel
from core.models.mixins import AtivacaoMixin, UpperCaseMixin
from core.choices.produtos import UnidadeMedidaChoices


class Servico(BaseModel, UpperCaseMixin, AtivacaoMixin):
    """Serviço comercial referenciado em linhas de orçamento (tipo SERVICO)."""

    UPPERCASE_FIELDS = ["codigo", "descricao", "categoria"]

    class Meta:
        db_table = "catalogo_servico"
        ordering = ("codigo", "descricao")
        verbose_name = "Serviço do catálogo"
        verbose_name_plural = "Serviços do catálogo"

    codigo = models.CharField(max_length=60, unique=True)
    descricao = models.CharField(max_length=255)
    categoria = models.CharField(
        max_length=120,
        blank=True,
        help_text="Classificação livre (ex.: Montagem, Engenharia).",
    )
    unidade_medida = models.CharField(
        max_length=10,
        choices=UnidadeMedidaChoices.choices,
        default=UnidadeMedidaChoices.HORAS,
    )
    preco_base = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Preço/custo de referência para propostas.",
    )
    observacoes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.codigo} — {self.descricao}"
