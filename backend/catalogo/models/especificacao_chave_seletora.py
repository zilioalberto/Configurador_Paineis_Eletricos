from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.produtos import (
    CorManoplaChaveSeletoraChoices,
    ModoMontagemChoices,
    TipoAcionamentoChaveSeletoraChoices,
    TipoChaveSeletoraChoices,
)
from .base import Produto


class EspecificacaoChaveSeletora(BaseModel):
    NUMERO_POSICOES_CHOICES = (
        (2, "2"),
        (3, "3"),
        (4, "4"),
    )
    DIAMETRO_FURO_CHOICES = (
        (Decimal("22"), "22 mm"),
        (Decimal("30"), "30 mm"),
    )
    GRAU_PROTECAO_IP_CHOICES = (
        ("IP55", "IP55"),
        ("IP65", "IP65"),
        ("IP66", "IP66"),
        ("IP67", "IP67"),
        ("IP69K", "IP69K"),
    )
    MODO_MONTAGEM_CHOICES = (
        (ModoMontagemChoices.PORTA, "Porta"),
    )

    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_chave_seletora",
    )

    tipo_seletor = models.CharField(
        max_length=20,
        choices=TipoChaveSeletoraChoices.choices,
        default=TipoChaveSeletoraChoices.MANOPLA,
    )

    numero_posicoes = models.PositiveSmallIntegerField(
        choices=NUMERO_POSICOES_CHOICES,
        default=3,
    )

    tipo_acionamento = models.CharField(
        max_length=20,
        choices=TipoAcionamentoChaveSeletoraChoices.choices,
        default=TipoAcionamentoChaveSeletoraChoices.RETENTIVO,
    )

    contatos_na = models.PositiveSmallIntegerField(default=0)
    contatos_nf = models.PositiveSmallIntegerField(default=0)

    diametro_furo_mm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        choices=DIAMETRO_FURO_CHOICES,
        default=Decimal("22"),
    )

    cor_manopla = models.CharField(
        max_length=20,
        choices=CorManoplaChaveSeletoraChoices.choices,
        default=CorManoplaChaveSeletoraChoices.PRETO,
    )

    iluminado = models.BooleanField(default=False)

    tensao_iluminacao_v = models.IntegerField(
        choices=TensaoIluminacaoBotaoChoices.choices,
        null=True,
        blank=True,
    )

    grau_protecao_ip = models.CharField(
        max_length=10,
        choices=GRAU_PROTECAO_IP_CHOICES,
        blank=True,
        null=True,
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=MODO_MONTAGEM_CHOICES,
        default=ModoMontagemChoices.PORTA,
    )

    class Meta:
        verbose_name = "Especificação de Chave Seletora"
        verbose_name_plural = "Especificações de Chaves Seletoras"

    def clean(self):
        super().clean()

        if self.numero_posicoes < 2:
            raise ValidationError(
                "A chave seletora deve possuir no mínimo 2 posições."
            )

        if self.iluminado:
            if self.tensao_iluminacao_v is None:
                raise ValidationError(
                    "Informe a tensão de iluminação para chave seletora iluminada."
                )

    def __str__(self):
        return (
            f"{self.produto} - {self.numero_posicoes} posições - "
            f"{self.tipo_acionamento}"
        )
