from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices, TipoCorrenteChoices
from core.choices.produtos import (
    ModoMontagemChoices,
    TipoAnalogicoPlcChoices,
    TipoExpansaoPLCChoices,
    TipoSinalDigitalChoices,
)
from catalogo.utils.plc_familia import normalizar_chave_familia_plc
from .base import Produto


class EspecificacaoExpansaoPLC(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_expansao_plc",
    )

    tipo_expansao = models.CharField(
        max_length=30,
        choices=TipoExpansaoPLCChoices.choices,
    )

    familia_plc = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Família ou linha do PLC compatível (texto livre; evite duplicar grafias parecidas).",
    )

    entradas_digitais = models.PositiveSmallIntegerField(default=0)
    saidas_digitais = models.PositiveSmallIntegerField(default=0)
    entradas_analogicas = models.PositiveSmallIntegerField(default=0)
    saidas_analogicas = models.PositiveSmallIntegerField(default=0)

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

    tipo_sinal_digital = models.CharField(
        max_length=10,
        choices=TipoSinalDigitalChoices.choices,
        blank=True,
    )

    tipo_sinal_analogico = models.CharField(
        max_length=30,
        choices=TipoAnalogicoPlcChoices.choices,
        blank=True,
        null=True,
        help_text="Obrigatório quando há entradas ou saídas analógicas.",
    )

    protocolo_comunicacao = models.CharField(
        max_length=50,
        blank=True,
        help_text="Ex: Profinet, Modbus TCP, EtherNet/IP.",
    )

    modo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
        default=ModoMontagemChoices.TRILHO_DIN,
    )

    class Meta:
        verbose_name = "Especificação de Expansão PLC"
        verbose_name_plural = "Especificações de Expansões PLC"

    def clean(self):
        super().clean()

        total_io = (
            self.entradas_digitais
            + self.saidas_digitais
            + self.entradas_analogicas
            + self.saidas_analogicas
        )

        if total_io <= 0:
            raise ValidationError(
                "A expansão PLC deve possuir pelo menos um ponto de I/O."
            )

        if self.familia_plc is not None:
            self.familia_plc = self.familia_plc.strip()
            if self.familia_plc:
                self.familia_plc = " ".join(self.familia_plc.split())
            else:
                self.familia_plc = None

        if self.familia_plc:
            chave = normalizar_chave_familia_plc(self.familia_plc)
            if chave:
                qs = EspecificacaoExpansaoPLC.objects.exclude(
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

        analog_total = self.entradas_analogicas + self.saidas_analogicas
        if analog_total == 0:
            self.tipo_sinal_analogico = None
        elif not self.tipo_sinal_analogico:
            raise ValidationError(
                {
                    "tipo_sinal_analogico": (
                        "Informe o tipo de sinal analógico quando houver "
                        "entradas ou saídas analógicas."
                    )
                }
            )

    def __str__(self):
        return (
            f"{self.produto} - "
            f"DI:{self.entradas_digitais} "
            f"DO:{self.saidas_digitais} "
            f"AI:{self.entradas_analogicas} "
            f"AO:{self.saidas_analogicas}"
        )
