from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.produtos import (
    CorBotaoChoices,
    ModoMontagemChoices,
    TipoAcionamentoBotaoModoChoices,
    TipoBotaoChoices,
)
from .base import Produto


class EspecificacaoBotao(BaseModel):
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
        related_name="especificacao_botao",
    )

    tipo_botao = models.CharField(
        max_length=20,
        choices=TipoBotaoChoices.choices,
    )

    tipo_acionamento = models.CharField(
        max_length=20,
        choices=TipoAcionamentoBotaoModoChoices.choices,
        default=TipoAcionamentoBotaoModoChoices.MOMENTANEO,
    )

    cor = models.CharField(
        max_length=20,
        choices=CorBotaoChoices.choices,
    )

    diametro_furo_mm = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        choices=DIAMETRO_FURO_CHOICES,
        default=Decimal("22"),
    )

    contatos_na = models.PositiveSmallIntegerField(default=0)
    contatos_nf = models.PositiveSmallIntegerField(default=0)

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
        verbose_name = "Especificação de Botão"
        verbose_name_plural = "Especificações de Botões"

    def clean(self):
        super().clean()

        if self.iluminado:
            if self.tensao_iluminacao_v is None:
                raise ValidationError(
                    "Informe a tensão de iluminação para botão iluminado."
                )

        if self.tipo_botao == TipoBotaoChoices.EMERGENCIA:
            if self.tipo_acionamento != TipoAcionamentoBotaoModoChoices.RETENCAO:
                raise ValidationError(
                    "Botão de emergência deve ser com retenção."
                )

    def __str__(self):
        return (
            f"{self.produto} - {self.tipo_botao} - "
            f"{self.cor} - {self.diametro_furo_mm} mm"
        )
