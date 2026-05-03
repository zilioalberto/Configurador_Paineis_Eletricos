from decimal import Decimal

from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.produtos import (
    ModoMontagemChoices,
    ProtocoloIHMChoices,
    TipoTelaIHMChoices,
)
from .base import Produto


class EspecificacaoIHM(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_ihm",
    )

    tamanho_tela_pol = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        help_text="Tamanho da tela em polegadas. Ex: 4.3, 7, 10.1.",
    )

    tipo_tela = models.CharField(
        max_length=20,
        choices=TipoTelaIHMChoices.choices,
        default=TipoTelaIHMChoices.TOUCH,
    )

    protocolo_comunicacao = models.CharField(
        max_length=30,
        choices=ProtocoloIHMChoices.choices,
    )

    possui_ethernet = models.BooleanField(default=True)
    possui_serial = models.BooleanField(default=False)
    possui_usb = models.BooleanField(default=False)

    tensao_alimentacao_v = models.IntegerField(
        choices=TensaoIluminacaoBotaoChoices.choices,
        default=TensaoIluminacaoBotaoChoices.V24,
        help_text="Tensão de alimentação (24, 110 ou 220 V).",
    )

    consumo_w = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
    )

    grau_protecao_ip_frontal = models.CharField(
        max_length=10,
        blank=True,
        help_text="Ex: IP65.",
    )

    dimensao_recorte_mm = models.CharField(
        max_length=30,
        blank=True,
        help_text="Ex: 192x138 mm.",
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=[(ModoMontagemChoices.PORTA, ModoMontagemChoices.PORTA.label)],
        default=ModoMontagemChoices.PORTA,
    )

    class Meta:
        verbose_name = "Especificação de IHM"
        verbose_name_plural = "Especificações de IHMs"

    def clean(self):
        super().clean()

        if self.tamanho_tela_pol <= Decimal("0"):
            raise ValidationError("O tamanho da tela deve ser maior que zero.")

        if (
            not self.possui_ethernet
            and not self.possui_serial
            and not self.possui_usb
        ):
            raise ValidationError(
                "Informe pelo menos uma interface de comunicação da IHM."
            )

    def __str__(self):
        return (
            f"{self.produto} - {self.tamanho_tela_pol}\" - "
            f"{self.protocolo_comunicacao}"
        )
