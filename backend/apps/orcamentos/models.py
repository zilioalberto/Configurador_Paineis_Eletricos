from __future__ import annotations

import uuid

from django.db import models


class StatusOrcamentoChoices(models.TextChoices):
    RASCUNHO = "RASCUNHO", "Rascunho"
    ENVIADO = "ENVIADO", "Enviado"
    APROVADO = "APROVADO", "Aprovado"
    REJEITADO = "REJEITADO", "Rejeitado"
    CANCELADO = "CANCELADO", "Cancelado"


class Orcamento(models.Model):
    """
    Esqueleto de orçamento comercial.
    Campos de cliente/projeto serão FK quando o módulo cadastros/projetos estiver integrado.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=32, unique=True, db_index=True)
    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    cliente_referencia = models.CharField(
        max_length=200,
        blank=True,
        help_text="Texto livre até existir cadastro de clientes.",
    )
    status = models.CharField(
        max_length=20,
        choices=StatusOrcamentoChoices.choices,
        default=StatusOrcamentoChoices.RASCUNHO,
        db_index=True,
    )
    valido_ate = models.DateField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "erp_orcamento"
        ordering = ("-criado_em",)

    def __str__(self) -> str:
        return f"{self.codigo} — {self.titulo}"


class OrcamentoItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orcamento = models.ForeignKey(
        Orcamento,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    ordem = models.PositiveIntegerField(default=0)
    descricao = models.CharField(max_length=500)
    quantidade = models.DecimalField(max_digits=14, decimal_places=4, default=1)
    preco_unitario = models.DecimalField(max_digits=16, decimal_places=4, default=0)

    class Meta:
        db_table = "erp_orcamento_item"
        ordering = ("orcamento_id", "ordem", "id")

    def __str__(self) -> str:
        return f"{self.descricao[:40]}"
