from django.db import models
from core.models import BaseModel
from projetos.models import Projeto


class ResumoDimensionamento(BaseModel):
    projeto = models.OneToOneField(
        Projeto,
        on_delete=models.CASCADE,
        related_name="resumo_dimensionamento",
    )

    corrente_total_painel_a = models.DecimalField(
        max_digits=12, decimal_places=2, default=0
    )

    corrente_estimada_fonte_24vcc_a = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Estimativa de corrente na fonte 24 Vcc (comando), com margem.",
    )

    necessita_fonte_24vcc = models.BooleanField(default=False)
    necessita_plc = models.BooleanField(default=False)
    necessita_expansao_plc = models.BooleanField(default=False)

    total_entradas_digitais = models.PositiveIntegerField(default=0)
    total_saidas_digitais = models.PositiveIntegerField(default=0)
    total_entradas_analogicas = models.PositiveIntegerField(default=0)
    total_saidas_analogicas = models.PositiveIntegerField(default=0)


    largura_painel_mm = models.PositiveIntegerField(default=0)
    altura_painel_mm = models.PositiveIntegerField(default=0)
    profundidade_painel_mm = models.PositiveIntegerField(default=0)

    taxa_ocupacao_percentual = models.DecimalField(
        max_digits=5, decimal_places=2, default=0
    )

    horas_montagem = models.DecimalField(
        max_digits=10, decimal_places=2, default=0
    )

    observacoes = models.TextField(blank=True)

    condutores_revisao_confirmada = models.BooleanField(
        default=False,
        help_text="Utilizador confirmou revisão/aprovação das bitolas de condutores no wizard.",
    )

    class Meta:
        verbose_name = "Resumo de Dimensionamento"
        verbose_name_plural = "Resumos de Dimensionamento"

    def __str__(self):
        return f"Dimensionamento - {self.projeto}"