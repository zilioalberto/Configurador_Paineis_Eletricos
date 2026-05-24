"""
Orçamentos comerciais (propostas): cabeçalho, itens, margens por cliente e numeração mensal.

Integra cadastros (cliente/contato), catálogo (produtos e IPI fiscal) e permissões ERP.
"""
from __future__ import annotations

import uuid

from decimal import Decimal

from django.conf import settings
from django.core.validators import MinValueValidator
from django.db import models
from django.db import transaction
from django.utils import timezone

from apps.cadastros.models import ContatoParceiro, ParceiroComercial
from apps.catalogo.models import Produto


class StatusOrcamentoChoices(models.TextChoices):
    RASCUNHO = "RASCUNHO", "Rascunho"
    ENVIADO = "ENVIADO", "Enviado"
    APROVADO = "APROVADO", "Aprovado"
    REJEITADO = "REJEITADO", "Rejeitado"
    CANCELADO = "CANCELADO", "Cancelado"


class TipoItemOrcamentoChoices(models.TextChoices):
    PRODUTO = "PRODUTO", "Produto"
    SERVICO = "SERVICO", "Servico"


class OrigemItemOrcamentoChoices(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    CONFIGURADOR = "CONFIGURADOR", "Configurador de paineis"
    CATALOGO = "CATALOGO", "Catalogo de produtos"


class SequenciaPropostaMensal(models.Model):
    """Contador atômico para códigos `Prop-MMNNN-AA` sem colisão."""

    ano = models.PositiveSmallIntegerField()
    mes = models.PositiveSmallIntegerField()
    ultimo_numero = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "erp_orcamento_sequencia_mensal"
        unique_together = ("ano", "mes")

    @classmethod
    def proximo_codigo(cls, data=None) -> str:
        """Gera próximo código único no formato Prop-{mês}{seq}-{ano}."""
        data = data or timezone.localdate()
        with transaction.atomic():
            sequencia, _created = cls.objects.select_for_update().get_or_create(
                ano=data.year,
                mes=data.month,
                defaults={"ultimo_numero": 0},
            )
            while True:
                sequencia.ultimo_numero += 1
                codigo = (
                    f"Prop-{data.month:02d}{sequencia.ultimo_numero:03d}-{data.year % 100:02d}"
                )
                if not Orcamento.objects.filter(codigo=codigo).exists():
                    sequencia.save(update_fields=("ultimo_numero",))
                    return codigo


class ConfiguracaoMargemCliente(models.Model):
    """Margens padrão de produtos e serviços aplicadas ao criar orçamento para o cliente."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cliente = models.OneToOneField(
        ParceiroComercial,
        on_delete=models.CASCADE,
        related_name="configuracao_margem_orcamento",
        limit_choices_to={"eh_cliente": True, "ativo": True},
    )
    margem_produtos_percentual = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
    )
    margem_servicos_percentual = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        default=0,
        validators=[MinValueValidator(Decimal("0"))],
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "erp_orcamento_margem_cliente"
        verbose_name = "Configuracao de margem por cliente"
        verbose_name_plural = "Configuracoes de margem por cliente"
        ordering = ("cliente__razao_social",)

    def __str__(self) -> str:
        return f"{self.cliente} - produtos {self.margem_produtos_percentual}%"


class Orcamento(models.Model):
    """Proposta comercial; código gerado automaticamente na primeira gravação."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo = models.CharField(max_length=32, unique=True, db_index=True, blank=True)
    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    cliente = models.ForeignKey(
        ParceiroComercial,
        on_delete=models.PROTECT,
        related_name="orcamentos",
        null=True,
        blank=True,
        limit_choices_to={"eh_cliente": True, "ativo": True},
    )
    contato_cliente = models.ForeignKey(
        ContatoParceiro,
        on_delete=models.PROTECT,
        related_name="orcamentos",
        null=True,
        blank=True,
    )
    cliente_referencia = models.CharField(
        max_length=200,
        blank=True,
        help_text="Texto desnormalizado para histórico e compatibilidade.",
    )
    margem_produtos_percentual = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    margem_servicos_percentual = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    status = models.CharField(
        max_length=20,
        choices=StatusOrcamentoChoices.choices,
        default=StatusOrcamentoChoices.RASCUNHO,
        db_index=True,
    )
    valido_ate = models.DateField(null=True, blank=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="criado por",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orcamentos_criados",
    )
    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="ultima alteracao por",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orcamentos_atualizados",
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "erp_orcamento"
        ordering = ("-criado_em",)

    def __str__(self) -> str:
        return f"{self.codigo} — {self.titulo}"

    def save(self, *args, **kwargs):
        if not self.codigo:
            self.codigo = SequenciaPropostaMensal.proximo_codigo()
        if self.cliente_id and not self.cliente_referencia:
            self.cliente_referencia = self.cliente.razao_social
        super().save(*args, **kwargs)


class OrcamentoItem(models.Model):
    """Linha da proposta: produto/serviço, custo, margem, preço e referência fiscal (IPI)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orcamento = models.ForeignKey(
        Orcamento,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    ordem = models.PositiveIntegerField(default=0)
    tipo = models.CharField(
        max_length=20,
        choices=TipoItemOrcamentoChoices.choices,
        default=TipoItemOrcamentoChoices.PRODUTO,
    )
    origem = models.CharField(
        max_length=20,
        choices=OrigemItemOrcamentoChoices.choices,
        default=OrigemItemOrcamentoChoices.MANUAL,
    )
    descricao = models.CharField(max_length=500)
    quantidade = models.DecimalField(max_digits=14, decimal_places=4, default=1)
    custo_unitario = models.DecimalField(max_digits=16, decimal_places=4, default=0)
    margem_percentual = models.DecimalField(max_digits=7, decimal_places=2, default=0)
    preco_unitario = models.DecimalField(max_digits=16, decimal_places=4, default=0)
    produto = models.ForeignKey(
        Produto,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="orcamento_itens",
    )
    aliquota_ipi = models.DecimalField(
        "Aliquota IPI (%)",
        max_digits=7,
        decimal_places=4,
        null=True,
        blank=True,
        help_text="Referencia do catalogo (primeiro item fiscal); pode ser ajustada na linha.",
    )

    class Meta:
        db_table = "erp_orcamento_item"
        ordering = ("orcamento_id", "ordem", "id")

    def __str__(self) -> str:
        return f"{self.descricao[:40]}"
