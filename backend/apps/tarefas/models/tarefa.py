from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.utils import timezone

from core.models import BaseModel

from .choices import (
    PrioridadeTarefaChoices,
    StatusSemanticoColunaChoices,
    StatusTarefaChoices,
    TipoTarefaChoices,
)
from .quadro import ColunaTarefa


def _status_from_coluna(coluna):
    if coluna.status_semantico in (
        StatusSemanticoColunaChoices.CONCLUIDO,
        StatusSemanticoColunaChoices.FINALIZADA,
    ):
        return StatusTarefaChoices.CONCLUIDA
    if coluna.status_semantico == StatusSemanticoColunaChoices.BLOQUEADO:
        return StatusTarefaChoices.BLOQUEADA
    if coluna.status_semantico == StatusSemanticoColunaChoices.CANCELADO:
        return StatusTarefaChoices.CANCELADA
    if coluna.status_semantico in (
        StatusSemanticoColunaChoices.EM_ANDAMENTO,
        StatusSemanticoColunaChoices.INICIADA,
    ):
        return StatusTarefaChoices.INICIADA
    return StatusTarefaChoices.PENDENTE


class Tarefa(BaseModel):
    titulo = models.CharField(max_length=180)
    descricao = models.TextField(blank=True)
    coluna = models.ForeignKey(
        ColunaTarefa,
        on_delete=models.PROTECT,
        related_name="tarefas",
    )
    responsavel = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tarefas_responsavel",
    )
    colaboradores = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="tarefas_colaborador",
    )
    criador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="tarefas_criadas",
    )
    prioridade = models.CharField(
        max_length=10,
        choices=PrioridadeTarefaChoices.choices,
        default=PrioridadeTarefaChoices.MEDIA,
    )
    prazo = models.DateTimeField(null=True, blank=True)
    status = models.CharField(
        max_length=20,
        choices=StatusTarefaChoices.choices,
        default=StatusTarefaChoices.PENDENTE,
    )
    tipo_etapa = models.CharField(
        max_length=20,
        choices=TipoTarefaChoices.choices,
        default=TipoTarefaChoices.NAO_CLASSIFICADA,
    )
    proposta_referencia = models.CharField(max_length=100, blank=True)
    ordem_producao_referencia = models.CharField(max_length=100, blank=True)
    horas_estipuladas = models.DecimalField(
        max_digits=7,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0"))],
    )
    ordem = models.PositiveIntegerField(default=0)
    concluida_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Tarefa"
        verbose_name_plural = "Tarefas"
        ordering = ("coluna__quadro__nome", "coluna__ordem", "ordem", "prazo", "titulo")
        indexes = (
            models.Index(fields=("status", "prazo"), name="tarefas_status_prazo_idx"),
            models.Index(fields=("responsavel", "status"), name="tarefas_resp_status_idx"),
        )

    def __str__(self):
        return self.titulo

    def pode_ser_excluida(self):
        """
        Critério estrito (sem apontamentos/sessões e status inicial) — útil para regras de UI
        ou integrações. Administradores e gestores podem excluir pela API mesmo quando este
        método retorna False (ver TarefaViewSet.destroy).
        """
        if self.status not in (
            StatusTarefaChoices.PENDENTE,
            StatusTarefaChoices.ABERTA,
        ):
            return False
        if self.apontamentos.exists():
            return False
        if self.sessoes_trabalho.exists():
            return False
        return True

    @property
    def esta_classificada(self):
        return self.tipo_etapa != TipoTarefaChoices.NAO_CLASSIFICADA

    @property
    def referencia_vinculo(self):
        if self.tipo_etapa == TipoTarefaChoices.PROPOSTA:
            return self.proposta_referencia
        if self.tipo_etapa == TipoTarefaChoices.PRODUCAO:
            return self.ordem_producao_referencia
        return ""

    @property
    def pode_iniciar(self):
        if self.status in (StatusTarefaChoices.CONCLUIDA, StatusTarefaChoices.CANCELADA):
            return False
        if not self.esta_classificada:
            return False
        try:
            self.validar_classificacao()
        except ValidationError:
            return False
        return True

    @property
    def pode_receber_apontamento(self):
        return self.pode_iniciar and self.status in (
            StatusTarefaChoices.INICIADA,
            StatusTarefaChoices.EM_ANDAMENTO,
        )

    def validar_classificacao(self):
        proposta = (self.proposta_referencia or "").strip()
        ordem_producao = (self.ordem_producao_referencia or "").strip()
        erros = {}

        if self.tipo_etapa == TipoTarefaChoices.NAO_CLASSIFICADA:
            if proposta or ordem_producao:
                erros["tipo_etapa"] = (
                    "Tarefa nao classificada nao deve possuir vinculo com PROP ou OP."
                )
        elif self.tipo_etapa == TipoTarefaChoices.PROPOSTA:
            if not proposta:
                erros["proposta_referencia"] = "Informe a PROP vinculada a tarefa."
            if ordem_producao:
                erros["ordem_producao_referencia"] = (
                    "Tarefa de proposta nao deve possuir vinculo com OP."
                )
        elif self.tipo_etapa == TipoTarefaChoices.PRODUCAO:
            if not ordem_producao:
                erros["ordem_producao_referencia"] = "Informe a OP vinculada a tarefa."
        elif self.tipo_etapa == TipoTarefaChoices.INTERNA:
            if proposta or ordem_producao:
                erros["tipo_etapa"] = (
                    "Tarefa interna nao deve possuir vinculo com PROP ou OP."
                )

        if self.status in (
            StatusTarefaChoices.INICIADA,
            StatusTarefaChoices.EM_ANDAMENTO,
        ) and not self.esta_classificada:
            erros["tipo_etapa"] = "Classifique a tarefa antes de iniciar."

        if erros:
            raise ValidationError(erros)

    def clean(self):
        super().clean()
        self.validar_classificacao()

    def save(self, *args, **kwargs):
        self.status = _status_from_coluna(self.coluna)
        self.full_clean(exclude=("colaboradores",))
        if self.status == StatusTarefaChoices.CONCLUIDA and self.concluida_em is None:
            self.concluida_em = timezone.now()
        if self.status != StatusTarefaChoices.CONCLUIDA:
            self.concluida_em = None
        super().save(*args, **kwargs)
