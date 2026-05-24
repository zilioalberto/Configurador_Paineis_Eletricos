"""Apontamento manual ou gerado pelo cronómetro de tarefa."""

from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from core.models import BaseModel

from .choices import OrigemApontamentoHoraChoices, StatusAprovacaoHoraChoices
from .tarefa import Tarefa


class ApontamentoHora(BaseModel):
    """Horas registradas por colaborador em uma tarefa (com aprovação opcional)."""

    tarefa = models.ForeignKey(Tarefa, on_delete=models.CASCADE, related_name="apontamentos")
    colaborador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="apontamentos_horas",
    )
    data = models.DateField()
    horas = models.DecimalField(max_digits=5, decimal_places=2)
    hora_inicio = models.DateTimeField(null=True, blank=True)
    hora_fim = models.DateTimeField(null=True, blank=True)
    etapa = models.CharField(max_length=120, blank=True)
    observacoes = models.TextField(blank=True)
    origem = models.CharField(
        max_length=20,
        choices=OrigemApontamentoHoraChoices.choices,
        default=OrigemApontamentoHoraChoices.COLABORADOR,
    )
    status_aprovacao = models.CharField(
        max_length=20,
        choices=StatusAprovacaoHoraChoices.choices,
        default=StatusAprovacaoHoraChoices.PENDENTE,
    )
    valor_hora_snapshot = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    justificativa_ajuste = models.TextField(blank=True)
    aprovado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="apontamentos_horas_aprovados",
    )
    aprovado_em = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = "Apontamento de hora"
        verbose_name_plural = "Apontamentos de horas"
        ordering = ("-data", "-criado_em")

    @property
    def horas_calculadas(self):
        return self.horas

    @property
    def custo_total(self):
        return (self.horas or Decimal("0.00")) * (self.valor_hora_snapshot or Decimal("0.00"))

    def clean(self):
        super().clean()
        if self.horas is not None and self.horas <= 0:
            raise ValidationError({"horas": "Informe uma quantidade de horas maior que zero."})
        if self.hora_inicio and self.hora_fim and self.hora_fim <= self.hora_inicio:
            raise ValidationError({"hora_fim": "A hora final deve ser maior que a hora inicial."})
        if self._state.adding and self.tarefa_id and not self.tarefa.pode_receber_apontamento:
            raise ValidationError(
                {
                    "tarefa": (
                        "Aponte horas apenas em tarefas classificadas e iniciadas."
                    )
                }
            )
        if self.status_aprovacao == StatusAprovacaoHoraChoices.AJUSTADO:
            if not (self.justificativa_ajuste or "").strip():
                raise ValidationError(
                    {
                        "justificativa_ajuste": (
                            "Informe a justificativa para apontamentos ajustados."
                        )
                    }
                )

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.status_aprovacao == StatusAprovacaoHoraChoices.APROVADO:
            if self.aprovado_em is None:
                self.aprovado_em = timezone.now()
        else:
            self.aprovado_por = None
            self.aprovado_em = None
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.tarefa} - {self.horas}h"
