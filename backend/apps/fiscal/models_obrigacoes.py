"""Modelos de gestão de obrigações fiscais mensais (pacote contabilidade)."""
from __future__ import annotations

import uuid

from django.db import models

from apps.fiscal.choices import (
    StatusObrigacaoFiscalChoices,
    StatusReconciliacaoFiscalChoices,
    TipoAnexoObrigacaoFiscalChoices,
    TipoHoleriteFiscalChoices,
    TipoObrigacaoFiscalChoices,
    TipoReconciliacaoFiscalChoices,
)
from apps.fiscal.utils import normalizar_cnpj


def obrigacao_anexo_upload_to(instance, filename: str) -> str:
    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else "pdf"
    comp = instance.pacote.competencia if instance.pacote_id else "sem-competencia"
    return f"fiscal/obrigacoes/{comp}/{uuid.uuid4()}.{ext}"


class PacoteObrigacaoFiscal(models.Model):
    """Pacote mensal de documentos e obrigações enviados pela contabilidade."""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    cnpj = models.CharField(max_length=14, db_index=True)
    competencia = models.CharField(max_length=7, db_index=True, help_text="Formato AAAA-MM.")
    recebido_em = models.DateField(null=True, blank=True)
    observacoes = models.TextField(blank=True)
    pacote_completo = models.BooleanField(
        default=False,
        help_text="Marcado quando todos os documentos esperados foram recebidos.",
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-competencia"]
        verbose_name = "Pacote de obrigações fiscais"
        verbose_name_plural = "Pacotes de obrigações fiscais"
        constraints = [
            models.UniqueConstraint(
                fields=["cnpj", "competencia"],
                name="fiscal_pacote_obrigacao_cnpj_competencia_unico",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.competencia} — {self.cnpj}"


class ObrigacaoFiscal(models.Model):
    """Guia ou imposto a pagar/recolher na competência."""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    pacote = models.ForeignKey(
        PacoteObrigacaoFiscal,
        on_delete=models.CASCADE,
        related_name="obrigacoes",
    )
    tipo = models.CharField(max_length=20, choices=TipoObrigacaoFiscalChoices.choices, db_index=True)
    descricao = models.CharField(max_length=255, blank=True)
    valor = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    valor_estimado = models.DecimalField(
        max_digits=14,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Valor estimado pelo ERP (projeção/conciliação).",
    )
    data_vencimento = models.DateField(null=True, blank=True)
    data_pagamento = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StatusObrigacaoFiscalChoices.choices,
        default=StatusObrigacaoFiscalChoices.PENDENTE,
        db_index=True,
    )
    numero_documento = models.CharField(max_length=80, blank=True)
    observacoes = models.TextField(blank=True)
    dados_extra = models.JSONField(default=dict, blank=True)
    documento_fiscal_emitido = models.ForeignKey(
        "DocumentoFiscalEmitido",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="obrigacoes_iss",
    )
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["data_vencimento", "tipo"]
        verbose_name = "Obrigação fiscal"
        verbose_name_plural = "Obrigações fiscais"

    def __str__(self) -> str:
        return f"{self.get_tipo_display()} — {self.pacote.competencia}"


class LinhaComposicaoObrigacao(models.Model):
    """Linha de composição (ex.: códigos DARF 1082/1099)."""

    obrigacao = models.ForeignKey(
        ObrigacaoFiscal,
        on_delete=models.CASCADE,
        related_name="linhas_composicao",
    )
    codigo = models.CharField(max_length=20, blank=True)
    descricao = models.CharField(max_length=255)
    valor = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        ordering = ["id"]
        verbose_name = "Linha de composição de obrigação"
        verbose_name_plural = "Linhas de composição de obrigação"


class AnexoObrigacaoFiscal(models.Model):
    """PDF ou comprovante anexo ao pacote mensal."""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    pacote = models.ForeignKey(
        PacoteObrigacaoFiscal,
        on_delete=models.CASCADE,
        related_name="anexos",
    )
    obrigacao = models.ForeignKey(
        ObrigacaoFiscal,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="anexos",
    )
    tipo_arquivo = models.CharField(
        max_length=20,
        choices=TipoAnexoObrigacaoFiscalChoices.choices,
        default=TipoAnexoObrigacaoFiscalChoices.OUTRO,
    )
    arquivo = models.FileField(upload_to=obrigacao_anexo_upload_to)
    nome_original = models.CharField(max_length=255, blank=True)
    parsed_data = models.JSONField(default=dict, blank=True)
    parse_sucesso = models.BooleanField(default=False)
    parse_erros = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-criado_em"]
        verbose_name = "Anexo de obrigação fiscal"
        verbose_name_plural = "Anexos de obrigações fiscais"


class SnapshotApuracaoIcms(models.Model):
    """Resumo da DIME/apuração ICMS importado da contabilidade."""

    pacote = models.OneToOneField(
        PacoteObrigacaoFiscal,
        on_delete=models.CASCADE,
        related_name="snapshot_icms",
    )
    saldo_credor_anterior = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    debitos_saidas = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    creditos_entradas = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    total_debitos = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    total_creditos = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    saldo_credor = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    imposto_a_recolher = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    valor_contabil_entradas = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    valor_contabil_saidas = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    dados_quadros = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = "Snapshot apuração ICMS"
        verbose_name_plural = "Snapshots apuração ICMS"


class HoleriteCompetencia(models.Model):
    """Holerite importado da contabilidade (alimenta Fator R e conciliação)."""

    pacote = models.ForeignKey(
        PacoteObrigacaoFiscal,
        on_delete=models.CASCADE,
        related_name="holerites",
    )
    colaborador = models.ForeignKey(
        "rh.Colaborador",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="holerites_fiscais",
    )
    cpf = models.CharField(max_length=14, blank=True, db_index=True)
    nome = models.CharField(max_length=180)
    tipo = models.CharField(
        max_length=20,
        choices=TipoHoleriteFiscalChoices.choices,
        default=TipoHoleriteFiscalChoices.OUTRO,
    )
    proventos = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    desconto_inss = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    base_fgts = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    fgts_mes = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    total_liquido = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    dados_extra = models.JSONField(default=dict, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nome"]
        verbose_name = "Holerite da competência"
        verbose_name_plural = "Holerites da competência"


class ReconciliacaoFiscal(models.Model):
    """Resultado de conciliação ERP × contabilidade."""

    pacote = models.ForeignKey(
        PacoteObrigacaoFiscal,
        on_delete=models.CASCADE,
        related_name="reconciliacoes",
    )
    tipo = models.CharField(max_length=20, choices=TipoReconciliacaoFiscalChoices.choices)
    valor_interno = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    valor_contabilidade = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    diferenca = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True)
    diferenca_percentual = models.DecimalField(max_digits=8, decimal_places=4, null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StatusReconciliacaoFiscalChoices.choices,
        default=StatusReconciliacaoFiscalChoices.PENDENTE,
    )
    detalhes = models.JSONField(default=dict, blank=True)
    mensagem = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["tipo"]
        verbose_name = "Reconciliação fiscal"
        verbose_name_plural = "Reconciliações fiscais"
        constraints = [
            models.UniqueConstraint(
                fields=["pacote", "tipo"],
                name="fiscal_reconciliacao_pacote_tipo_unico",
            ),
        ]


class LancamentoFinanceiroImposto(models.Model):
    """Registro de pagamento de imposto (integração financeira — Fase 4)."""

    public_id = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True, editable=False)
    obrigacao = models.OneToOneField(
        ObrigacaoFiscal,
        on_delete=models.CASCADE,
        related_name="lancamento_financeiro",
    )
    valor = models.DecimalField(max_digits=14, decimal_places=2)
    data = models.DateField()
    conta = models.CharField(max_length=80, blank=True, default="Impostos")
    centro_custo = models.CharField(max_length=80, blank=True, default="Administrativo")
    observacoes = models.TextField(blank=True)
    criado_em = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Lançamento financeiro de imposto"
        verbose_name_plural = "Lançamentos financeiros de impostos"
