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
from apps.catalogo.models import Produto, Servico


class StatusOrcamentoChoices(models.TextChoices):
    RASCUNHO = "RASCUNHO", "Rascunho"
    FINALIZADO = "FINALIZADO", "Finalizado"
    ENVIADO = "ENVIADO", "Enviado"
    APROVADO = "APROVADO", "Aprovado"
    REJEITADO = "REJEITADO", "Rejeitado"
    CANCELADO = "CANCELADO", "Cancelado"


class TipoRevisaoOrcamentoChoices(models.TextChoices):
    INICIAL = "INICIAL", "Inicial"
    COMERCIAL = "COMERCIAL", "Comercial"
    TECNICA = "TECNICA", "Tecnica"


class TipoItemOrcamentoChoices(models.TextChoices):
    PRODUTO = "PRODUTO", "Produto"
    SERVICO = "SERVICO", "Servico"


class OrigemItemOrcamentoChoices(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    CONFIGURADOR = "CONFIGURADOR", "Configurador de paineis"
    CATALOGO = "CATALOGO", "Catalogo de produtos"
    HERANCA_REVISAO = "HERANCA_REVISAO", "Heranca de revisao anterior"


class ModoConfiguradorPainelChoices(models.TextChoices):
    ATIVO = "ATIVO", "Ativo"
    HERANCA_HISTORICA = "HERANCA_HISTORICA", "Heranca historica"


class SequenciaPropostaMensal(models.Model):
    """Contador atômico para códigos `Prop-MMNNN-AA` sem colisão."""

    ano = models.PositiveSmallIntegerField()
    mes = models.PositiveSmallIntegerField()
    ultimo_numero = models.PositiveIntegerField(default=0)

    class Meta:
        db_table = "orcamento_sequencia_mensal"
        unique_together = ("ano", "mes")

    @classmethod
    def proximo_codigo_base(cls, data=None) -> str:
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
                codigo_base = (
                    f"Prop-{data.month:02d}{sequencia.ultimo_numero:03d}-{data.year % 100:02d}"
                )
                if not Orcamento.objects.filter(codigo_base=codigo_base).exists():
                    sequencia.save(update_fields=("ultimo_numero",))
                    return codigo_base


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
        db_table = "orcamento_margem_cliente"
        verbose_name = "Configuracao de margem por cliente"
        verbose_name_plural = "Configuracoes de margem por cliente"
        ordering = ("cliente__razao_social",)

    def __str__(self) -> str:
        return f"{self.cliente} - produtos {self.margem_produtos_percentual}%"


class Orcamento(models.Model):
    """Proposta comercial; código gerado automaticamente na primeira gravação."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    codigo_base = models.CharField(max_length=32, db_index=True, blank=True)
    revisao = models.CharField(max_length=4, default="", blank=True)
    codigo = models.CharField(max_length=48, unique=True, db_index=True, blank=True)
    titulo = models.CharField(max_length=200)
    descricao = models.TextField(blank=True)
    tipo_revisao = models.CharField(
        max_length=20,
        choices=TipoRevisaoOrcamentoChoices.choices,
        default=TipoRevisaoOrcamentoChoices.INICIAL,
    )
    orcamento_origem = models.ForeignKey(
        "self",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="revisoes_derivadas",
    )
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
        db_table = "orcamento"
        ordering = ("-criado_em",)
        constraints = [
            models.UniqueConstraint(
                fields=("codigo_base", "revisao"),
                name="uq_orcamento_codigo_base_revisao",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.codigo} — {self.titulo}"

    @staticmethod
    def montar_codigo_exibicao(codigo_base: str, revisao: str) -> str:
        base = (codigo_base or "").strip()
        rev = (revisao or "").strip()
        if not rev:
            return base
        return f"{base} Rev {rev}"

    def save(self, *args, **kwargs):
        if not self.codigo_base:
            legado = (self.codigo or "").strip()
            if legado and " Rev " in legado:
                base, rev = legado.rsplit(" Rev ", 1)
                self.codigo_base = base.strip()
                self.revisao = rev.strip()[:4]
            elif legado:
                self.codigo_base = legado
            else:
                self.codigo_base = SequenciaPropostaMensal.proximo_codigo_base()
        self.codigo = self.montar_codigo_exibicao(self.codigo_base, self.revisao)
        if self.cliente_id and not self.cliente_referencia:
            self.cliente_referencia = self.cliente.razao_social
        super().save(*args, **kwargs)

    @property
    def editavel(self) -> bool:
        return self.status == StatusOrcamentoChoices.RASCUNHO


class OrcamentoConfiguradorPainel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orcamento = models.ForeignKey(
        Orcamento,
        on_delete=models.CASCADE,
        related_name="configuradores_painel",
    )
    projeto_configurador = models.ForeignKey(
        "projetos.ProjetoConfigurador",
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="orcamentos_configurador_painel",
        db_column="projeto_configurador_id",
    )
    projeto_configurador_origem = models.ForeignKey(
        "projetos.ProjetoConfigurador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="orcamentos_configurador_painel_derivados",
        db_column="projeto_configurador_origem_id",
    )
    configurador_painel_origem = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="derivados_revisao",
    )
    ordem = models.PositiveIntegerField(default=0)
    descricao_painel = models.CharField(max_length=200)
    modo = models.CharField(
        max_length=30,
        choices=ModoConfiguradorPainelChoices.choices,
        default=ModoConfiguradorPainelChoices.ATIVO,
    )
    sincronizado_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "orcamento_configurador_painel"
        ordering = ("orcamento_id", "ordem", "id")

    def __str__(self) -> str:
        return f"{self.descricao_painel} ({self.modo})"


class OrcamentoItem(models.Model):
    """Linha da proposta: produto/serviço, custo, margem, preço e referência fiscal (IPI)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orcamento = models.ForeignKey(
        Orcamento,
        on_delete=models.CASCADE,
        related_name="itens",
    )
    configurador_painel = models.ForeignKey(
        OrcamentoConfiguradorPainel,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="itens",
    )
    item_origem = models.ForeignKey(
        "self",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="derivados_revisao",
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
    editavel = models.BooleanField(default=True)
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
    servico = models.ForeignKey(
        Servico,
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
        db_table = "orcamento_item"
        ordering = ("orcamento_id", "ordem", "id")

    def __str__(self) -> str:
        return f"{self.descricao[:40]}"


class OrcamentoSnapshot(models.Model):
    """Cópia imutável da oferta enviada ao cliente para uma revisão do orçamento."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    orcamento = models.OneToOneField(
        Orcamento,
        on_delete=models.PROTECT,
        related_name="snapshot_envio",
    )
    status_orcamento = models.CharField(max_length=20, choices=StatusOrcamentoChoices.choices)
    codigo = models.CharField(max_length=48)
    dados = models.JSONField()
    itens = models.JSONField()
    total = models.DecimalField(max_digits=18, decimal_places=4, default=0)
    gerado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        verbose_name="gerado por",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="orcamentos_snapshots_gerados",
    )
    gerado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "orcamento_snapshot"
        ordering = ("-gerado_em",)

    def __str__(self) -> str:
        return f"Snapshot {self.codigo} em {self.gerado_em:%Y-%m-%d %H:%M}"
