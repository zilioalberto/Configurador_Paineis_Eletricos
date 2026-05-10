from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices, TipoCorrenteChoices
from core.choices.produtos import (
    InterfaceFisicaGatewayChoices,
    ModoMontagemChoices,
    ProtocoloIndustrialChoices,
)
from .base import Produto


class EspecificacaoGateway(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_gateway",
    )

    protocolo_entrada = models.CharField(
        max_length=30,
        choices=ProtocoloIndustrialChoices.choices,
    )

    protocolo_saida = models.CharField(
        max_length=30,
        choices=ProtocoloIndustrialChoices.choices,
    )

    interface_entrada = models.CharField(
        max_length=20,
        choices=InterfaceFisicaGatewayChoices.choices,
    )

    interface_saida = models.CharField(
        max_length=20,
        choices=InterfaceFisicaGatewayChoices.choices,
    )

    quantidade_portas_ethernet = models.PositiveSmallIntegerField(default=1)
    quantidade_portas_serial = models.PositiveSmallIntegerField(default=0)

    suporta_modbus_tcp = models.BooleanField(default=False)
    suporta_modbus_rtu = models.BooleanField(default=False)
    suporta_profinet = models.BooleanField(default=False)
    suporta_ethernet_ip = models.BooleanField(default=False)
    suporta_profibus = models.BooleanField(default=False)
    suporta_opc_ua = models.BooleanField(default=False)
    suporta_mqtt = models.BooleanField(default=False)

    tensao_alimentacao_v = models.IntegerField(
        choices=TensaoChoices.choices,
        null=True,
        blank=True,
    )

    tipo_corrente_alimentacao = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        null=True,
        blank=True,
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=[
            (ModoMontagemChoices.TRILHO_DIN, ModoMontagemChoices.TRILHO_DIN.label),
            (ModoMontagemChoices.PLACA, ModoMontagemChoices.PLACA.label),
        ],
        default=ModoMontagemChoices.TRILHO_DIN,
    )

    observacao_protocolos = models.TextField(blank=True)

    class Meta:
        verbose_name = "Especificação de Gateway"
        verbose_name_plural = "Especificações de Gateways"

    def clean(self):
        super().clean()

        if self.protocolo_entrada == self.protocolo_saida:
            raise ValidationError(
                "O protocolo de entrada e o protocolo de saída devem ser diferentes para um gateway."
            )

        if (
            self.quantidade_portas_ethernet <= 0
            and self.quantidade_portas_serial <= 0
        ):
            raise ValidationError(
                "Informe pelo menos uma porta de comunicação."
            )

    def __str__(self):
        return (
            f"{self.produto} - "
            f"{self.protocolo_entrada} → {self.protocolo_saida}"
        )
