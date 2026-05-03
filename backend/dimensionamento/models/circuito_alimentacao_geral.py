from django.db import models

from core.models import BaseModel
from core.choices import TipoCorrenteChoices
from projetos.models import Projeto


class DimensionamentoCircuitoAlimentacaoGeral(BaseModel):
    """
    Dimensionamento do circuito de alimentação geral (entrada) do painel,
    com base no resumo de dimensionamento e parâmetros elétricos do projeto.
    """

    projeto = models.OneToOneField(
        Projeto,
        on_delete=models.CASCADE,
        related_name="dimensionamento_alimentacao_geral",
    )

    corrente_total_painel_a = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        help_text="Referência: ResumoDimensionamento.corrente_total_painel_a no momento do cálculo.",
    )
    tipo_corrente = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
    )
    numero_fases = models.IntegerField(
        null=True,
        blank=True,
        help_text="Cópia de projetos_projeto.numero_fases (CA).",
    )
    possui_neutro = models.BooleanField()
    possui_terra = models.BooleanField(
        help_text="Alimentação com condutor de proteção (PE/terra).",
    )

    quantidade_condutores_fase = models.PositiveSmallIntegerField(
        default=0,
        help_text="Condutores de fase (ou pólos ativos em CC: ex. 2).",
    )
    quantidade_condutores_neutro = models.PositiveSmallIntegerField(
        default=0,
        help_text="0 se não houver neutro; 1 se houver condutor N.",
    )

    secao_condutor_fase_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    secao_condutor_neutro_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    secao_condutor_pe_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    secao_condutor_fase_escolhida_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    secao_condutor_neutro_escolhida_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )
    secao_condutor_pe_escolhida_mm2 = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    condutores_aprovado = models.BooleanField(
        default=False,
        help_text="Bitolas da alimentação geral aprovadas na revisão (lista de aprovados).",
    )

    observacoes = models.TextField(blank=True)
    memoria_calculo = models.TextField(blank=True)

    class Meta:
        verbose_name = "Dimensionamento — alimentação geral do painel"
        verbose_name_plural = "Dimensionamentos — alimentação geral do painel"

    def __str__(self):
        return f"Alimentação geral — {self.projeto}"
