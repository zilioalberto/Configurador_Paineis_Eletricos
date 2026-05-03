from django.db import models

from core.models import BaseModel
from core.choices import TipoCargaChoices
from cargas.models import Carga
from projetos.models import Projeto


class ClassificacaoCircuitoChoices(models.TextChoices):
    POTENCIA = "POTENCIA", "Potência"
    COMANDO = "COMANDO", "Comando"
    SINAL = "SINAL", "Sinal"


class DimensionamentoCircuitoCarga(BaseModel):
    """
    Dimensionamento dos condutores internos ao painel para uma carga (circuito).
    """

    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name="dimensionamentos_circuito_carga",
    )
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="dimensionamento_circuito",
    )

    tipo_carga = models.CharField(
        max_length=30,
        choices=TipoCargaChoices.choices,
        db_index=True,
    )
    classificacao_circuito = models.CharField(
        max_length=20,
        choices=ClassificacaoCircuitoChoices.choices,
        default=ClassificacaoCircuitoChoices.POTENCIA,
    )

    corrente_calculada_a = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Corrente por unidade ou do elemento (conforme especificação da carga).",
    )
    corrente_projeto_a = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Corrente após aplicar fator de demanda do projeto (e quantidade, quando aplicável).",
    )

    quantidade_condutores_fase = models.PositiveSmallIntegerField(
        default=0,
        help_text="Condutores de fase/potência ou, em comando/sinal, uso conforme regra documentada.",
    )
    quantidade_condutores_comando = models.PositiveSmallIntegerField(default=0)
    quantidade_condutores_sinal = models.PositiveSmallIntegerField(default=0)

    possui_neutro = models.BooleanField(default=False)
    possui_pe = models.BooleanField(default=False)

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
        help_text="Se preenchido, substitui a seção sugerida para fase (validação Iz ≥ corrente).",
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
        help_text="Bitolas deste circuito foram aprovadas na revisão (lista de aprovados).",
    )

    observacoes = models.TextField(blank=True)
    memoria_calculo = models.TextField(blank=True)

    class Meta:
        verbose_name = "Dimensionamento de circuito (carga)"
        verbose_name_plural = "Dimensionamentos de circuitos (cargas)"
        ordering = ["projeto", "carga__tag"]

    def __str__(self):
        return f"{self.carga.tag} — {self.get_tipo_carga_display()}"
