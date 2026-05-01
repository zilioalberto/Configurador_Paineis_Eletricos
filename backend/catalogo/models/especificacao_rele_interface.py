from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.produtos import (
    TipoContatoChoices,
    TipoMontagemReleChoices,
    TipoReleInterfaceChoices,
)
from .base import Produto


class EspecificacaoReleInterface(BaseModel):
    QUANTIDADE_CONTATOS_CHOICES = (
        (1, "1"),
        (2, "2"),
        (3, "3"),
        (4, "4"),
    )

    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_rele_interface",
    )

    tipo_rele = models.CharField(
        max_length=30,
        choices=TipoReleInterfaceChoices.choices,
        help_text="Tipo do relé (eletromecânico ou estado sólido).",
    )

    tensao_bobina_v = models.IntegerField(
        choices=TensaoIluminacaoBotaoChoices.choices,
        help_text="Tensão da bobina (24, 110 ou 220 V).",
    )

    quantidade_contatos = models.PositiveSmallIntegerField(
        choices=QUANTIDADE_CONTATOS_CHOICES,
        default=1,
        help_text="Número de contatos disponíveis.",
    )

    tipo_contato = models.CharField(
        max_length=20,
        choices=TipoContatoChoices.choices,
        help_text="Tipo de contato do relé.",
    )

    corrente_contato_a = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Corrente máxima suportada pelo contato.",
    )

    possui_base = models.BooleanField(
        default=False,
        help_text="Indica se o relé possui base (soquete).",
    )

    possui_led_indicacao = models.BooleanField(default=False)

    tipo_montagem = models.CharField(
        max_length=20,
        choices=TipoMontagemReleChoices.choices,
        blank=True,
        null=True,
    )

    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Especificação de Relé de Interface"
        verbose_name_plural = "Especificações de Relés de Interface"

    def __str__(self):
        return f"Relé {self.tensao_bobina_v}V - {self.corrente_contato_a}A"
