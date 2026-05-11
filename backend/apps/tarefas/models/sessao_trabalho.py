from decimal import Decimal, ROUND_HALF_UP

from django.conf import settings
from django.db import models
from django.db.models import Q
from django.utils import timezone

from core.models import BaseModel

from .choices import MotivoEncerramentoSessaoChoices, OrigemApontamentoHoraChoices
from .apontamento import ApontamentoHora
from .tarefa import Tarefa


class SessaoTrabalhoTarefa(BaseModel):
    tarefa = models.ForeignKey(
        Tarefa,
        on_delete=models.CASCADE,
        related_name="sessoes_trabalho",
    )
    colaborador = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.PROTECT,
        related_name="sessoes_trabalho_tarefas",
    )
    iniciado_em = models.DateTimeField(default=timezone.now)
    finalizado_em = models.DateTimeField(null=True, blank=True)
    etapa = models.CharField(max_length=120, blank=True, default="Cronometro")
    observacoes = models.TextField(blank=True)
    origem = models.CharField(
        max_length=20,
        choices=OrigemApontamentoHoraChoices.choices,
        default=OrigemApontamentoHoraChoices.COLABORADOR,
    )
    motivo_encerramento = models.CharField(
        max_length=30,
        choices=MotivoEncerramentoSessaoChoices.choices,
        blank=True,
    )
    apontamento = models.OneToOneField(
        ApontamentoHora,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="sessao_trabalho",
    )

    class Meta:
        verbose_name = "Sessao de trabalho em tarefa"
        verbose_name_plural = "Sessoes de trabalho em tarefas"
        ordering = ("-iniciado_em",)
        constraints = (
            models.UniqueConstraint(
                fields=("colaborador",),
                condition=Q(finalizado_em__isnull=True),
                name="tarefas_sess_ativa_colab_unq",
            ),
        )
        indexes = (
            models.Index(fields=("tarefa", "-iniciado_em"), name="tarefas_sess_tarefa_idx"),
            models.Index(
                fields=("colaborador", "finalizado_em"),
                name="tarefas_sess_colab_idx",
            ),
        )

    def __str__(self):
        return f"{self.tarefa} - {self.colaborador}"

    @property
    def em_aberto(self):
        return self.finalizado_em is None

    def duracao_segundos(self, referencia=None):
        fim = self.finalizado_em or referencia or timezone.now()
        return max(0, int((fim - self.iniciado_em).total_seconds()))

    def horas_decimal(self, referencia=None):
        horas = Decimal(self.duracao_segundos(referencia)) / Decimal(3600)
        horas = horas.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return max(horas, Decimal("0.01"))

    def encerrar(
        self,
        *,
        finalizado_em=None,
        motivo=MotivoEncerramentoSessaoChoices.MANUAL,
        observacoes="",
    ):
        if not self.em_aberto:
            return self.apontamento

        finalizado_em = finalizado_em or timezone.now()
        observacao = (
            observacoes
            or self.observacoes
            or f"Contagem iniciada em {timezone.localtime(self.iniciado_em):%d/%m/%Y %H:%M}."
        )
        apontamento = ApontamentoHora.objects.create(
            tarefa=self.tarefa,
            colaborador=self.colaborador,
            data=timezone.localdate(finalizado_em),
            horas=self.horas_decimal(finalizado_em),
            hora_inicio=self.iniciado_em,
            hora_fim=finalizado_em,
            etapa=self.etapa or "Cronometro",
            observacoes=observacao,
            origem=self.origem,
        )
        self.finalizado_em = finalizado_em
        self.motivo_encerramento = motivo
        self.apontamento = apontamento
        self.save(
            update_fields=(
                "finalizado_em",
                "motivo_encerramento",
                "apontamento",
                "atualizado_em",
            )
        )
        return apontamento
