"""Catálogo de serviços prestados (propostas comerciais)."""

from django.db import models
from django.utils import timezone

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
    preco_atualizado_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data da última revisão comercial do preço de referência.",
    )
    observacoes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.codigo} — {self.descricao}"

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
