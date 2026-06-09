"""Relacionamentos de compatibilidade entre produtos do catálogo."""

from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.choices.produtos import CategoriaProdutoNomeChoices, TipoBorneChoices
from core.models import BaseModel
from .base import Produto


class ProdutoAcessorioCompativel(BaseModel):
    """Acessório explicitamente compatível com um produto base do catálogo."""

    produto_base = models.ForeignKey(
        Produto,
        on_delete=models.CASCADE,
        related_name="acessorios_compativeis",
    )
    acessorio = models.ForeignKey(
        Produto,
        on_delete=models.PROTECT,
        related_name="produtos_base_compativeis",
    )
    tipo_acessorio = models.CharField(
        max_length=20,
        choices=TipoBorneChoices.choices,
    )
    quantidade_padrao = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("1"),
    )
    prioridade = models.PositiveSmallIntegerField(default=0)
    observacoes = models.TextField(blank=True)

    class Meta:
        verbose_name = "Acessório compatível"
        verbose_name_plural = "Acessórios compatíveis"
        ordering = ["produto_base__codigo", "tipo_acessorio", "prioridade", "acessorio__codigo"]
        constraints = [
            models.UniqueConstraint(
                fields=["produto_base", "acessorio", "tipo_acessorio"],
                name="uq_produto_acessorio_compativel",
            ),
        ]

    def clean(self):
        super().clean()
        if self.produto_base_id and self.acessorio_id and self.produto_base_id == self.acessorio_id:
            raise ValidationError("O acessório compatível deve ser diferente do produto base.")
        if (
            self.produto_base_id
            and self.produto_base.categoria != CategoriaProdutoNomeChoices.BORNE
        ):
            raise ValidationError({"produto_base": "O produto base deve ser da categoria Borne."})
        if self.acessorio_id and self.acessorio.categoria != CategoriaProdutoNomeChoices.BORNE:
            raise ValidationError({"acessorio": "O acessório deve ser da categoria Borne."})
        spec = getattr(self.acessorio, "especificacao_borne", None) if self.acessorio_id else None
        if spec is not None and spec.tipo_borne != self.tipo_acessorio:
            raise ValidationError(
                {"tipo_acessorio": "O tipo do acessório deve coincidir com a especificação do produto."}
            )

    def __str__(self):
        return f"{self.produto_base} -> {self.acessorio} ({self.tipo_acessorio})"
