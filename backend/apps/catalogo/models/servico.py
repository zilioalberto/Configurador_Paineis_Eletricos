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
    custo_referencia = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Custo de referência para compor o preço das propostas (custo × margem).",
    )
    custo_atualizado_em = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Data da última atualização do custo de referência.",
    )
    observacoes = models.TextField(blank=True)

    def __str__(self) -> str:
        return f"{self.codigo} — {self.descricao}"

    def save(self, *args, **kwargs):
        custo_mudou = self._state.adding
        if not self._state.adding and self.pk:
            custo_anterior = (
                type(self).objects.filter(pk=self.pk)
                .values_list("custo_referencia", flat=True)
                .first()
            )
            custo_mudou = custo_anterior != self.custo_referencia
        if custo_mudou:
            self.custo_atualizado_em = timezone.now()
            update_fields = kwargs.get("update_fields")
            if update_fields is not None:
                kwargs["update_fields"] = set(update_fields) | {"custo_atualizado_em"}
        super().save(*args, **kwargs)
