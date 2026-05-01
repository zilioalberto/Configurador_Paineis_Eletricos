from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    InterfaceFisicaGatewayChoices,
    ModoMontagemChoices,
    ProtocoloIndustrialChoices,
    TipoModuloComunicacaoChoices,
)
from catalogo.utils.plc_familia import normalizar_chave_familia_plc
from .base import Produto


class EspecificacaoModuloComunicacao(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_modulo_comunicacao",
    )

    familia_plc = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Família ou linha do PLC compatível (texto livre; evite duplicar grafias parecidas).",
    )

    tipo_modulo = models.CharField(
        max_length=30,
        choices=TipoModuloComunicacaoChoices.choices,
        default=TipoModuloComunicacaoChoices.INTERFACE_REDE,
    )

    protocolo = models.CharField(
        max_length=30,
        choices=ProtocoloIndustrialChoices.choices,
    )

    interface_fisica = models.CharField(
        max_length=20,
        choices=InterfaceFisicaGatewayChoices.choices,
        default=InterfaceFisicaGatewayChoices.ETHERNET,
    )

    quantidade_portas = models.PositiveSmallIntegerField(default=1)

    suporta_master = models.BooleanField(default=False)
    suporta_slave = models.BooleanField(default=False)
    suporta_client = models.BooleanField(default=False)
    suporta_server = models.BooleanField(default=False)

    modo_montagem = models.CharField(
        max_length=20,
        choices=[
            (ModoMontagemChoices.TRILHO_DIN, ModoMontagemChoices.TRILHO_DIN.label),
            (ModoMontagemChoices.PLACA, ModoMontagemChoices.PLACA.label),
        ],
        default=ModoMontagemChoices.TRILHO_DIN,
    )

    class Meta:
        verbose_name = "Especificação de Módulo de Comunicação"
        verbose_name_plural = "Especificações de Módulos de Comunicação"

    def clean(self):
        super().clean()

        if self.familia_plc is not None:
            self.familia_plc = self.familia_plc.strip()
            if self.familia_plc:
                self.familia_plc = " ".join(self.familia_plc.split())
            else:
                self.familia_plc = None

        if self.familia_plc:
            chave = normalizar_chave_familia_plc(self.familia_plc)
            if chave:
                qs = EspecificacaoModuloComunicacao.objects.exclude(
                    familia_plc__isnull=True
                ).exclude(familia_plc="")
                if self.pk:
                    qs = qs.exclude(pk=self.pk)

                for other in qs.iterator():
                    if normalizar_chave_familia_plc(other.familia_plc) == chave:
                        raise ValidationError(
                            {
                                "familia_plc": (
                                    f'Já existe a família «{other.familia_plc}». '
                                    "Use o mesmo texto para evitar duplicatas."
                                )
                            }
                        )

    def __str__(self):
        return f"Módulo comunicação - {self.produto}"
