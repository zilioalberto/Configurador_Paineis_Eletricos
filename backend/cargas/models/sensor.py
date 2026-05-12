from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.choices import (
    TipoCargaChoices,
    TipoSensorChoices,
    TipoSinalChoices,
    TipoSinaisAnalogicosChoices,
    TensaoChoices,
    TipoCorrenteChoices,
)

from .base import Carga
from .io_sync import reset_io_flags, save_io_flags


class CargaSensor(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="sensor",
        limit_choices_to={"tipo": TipoCargaChoices.SENSOR},
    )

    tipo_sensor = models.CharField(
        max_length=30,
        choices=TipoSensorChoices.choices,
    )

    tipo_sinal = models.CharField(
        max_length=30,
        choices=TipoSinalChoices.choices,
        default=TipoSinalChoices.DIGITAL,
    )

    tipo_sinal_analogico = models.CharField(
        max_length=30,
        choices=TipoSinaisAnalogicosChoices.choices,
        null=True,
        blank=True,
    )

    tensao_alimentacao = models.IntegerField(
        choices=TensaoChoices.choices,
        default=TensaoChoices.V24,
        help_text="Tensão de alimentação do sensor.",
    )

    tipo_corrente = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        default=TipoCorrenteChoices.CC,
        help_text="Tipo de corrente da alimentação do sensor.",
    )

    corrente_consumida_ma = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("20.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Corrente consumida pelo sensor em mA.",
    )

    quantidade_fios = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Quantidade de fios do sensor.",
    )

    range_medicao = models.CharField(
        max_length=100,
        blank=True,
        default="",
        help_text="Faixa de medição (opcional).",
    )

    pnp = models.BooleanField(default=False)
    npn = models.BooleanField(default=False)

    normalmente_aberto = models.BooleanField(default=False)
    normalmente_fechado = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Especificação de Sensor"
        verbose_name_plural = "Especificações de Sensores"

    def __str__(self):
        return f"Sensor - {self.carga.tag}"

    def clean(self):
        erros = {}

        if self.carga and self.carga.tipo != TipoCargaChoices.SENSOR:
            erros["carga"] = "A carga vinculada deve ser do tipo SENSOR."

        if self.pnp and self.npn:
            erros["pnp"] = "O sensor não pode ser PNP e NPN ao mesmo tempo."
            erros["npn"] = "O sensor não pode ser PNP e NPN ao mesmo tempo."

        if self.normalmente_aberto and self.normalmente_fechado:
            erros["normalmente_aberto"] = "O sensor não pode ser NA e NF ao mesmo tempo."
            erros["normalmente_fechado"] = "O sensor não pode ser NA e NF ao mesmo tempo."

        # DIGITAL
        if self.tipo_sinal == TipoSinalChoices.DIGITAL:
            if self.tipo_sinal_analogico:
                erros["tipo_sinal_analogico"] = (
                    "Sensores digitais não devem ter tipo de sinal analógico preenchido."
                )

        # ANALOGICO
        elif self.tipo_sinal == TipoSinalChoices.ANALOGICO:
            if not self.tipo_sinal_analogico:
                erros["tipo_sinal_analogico"] = (
                    "Informe o tipo de sinal analógico para sensores analógicos."
                )

            if self.pnp or self.npn:
                erros["pnp"] = "Sensores analógicos não devem usar PNP/NPN."
                erros["npn"] = "Sensores analógicos não devem usar PNP/NPN."

        # ANALOGICO_DIGITAL
        elif self.tipo_sinal == TipoSinalChoices.ANALOGICO_DIGITAL:
            if not self.tipo_sinal_analogico:
                erros["tipo_sinal_analogico"] = (
                    "Informe o tipo de sinal analógico para sensores analógico-digitais."
                )

        if erros:
            raise ValidationError(erros)

    def sincronizar_quantidades_carga(self):
        """
        Atualiza as quantidades de IO da carga com base no tipo de sinal do sensor.
        Só marca IO quando o projeto possuir PLC.
        """
        if not self.carga:
            return

        projeto = self.carga.projeto

        reset_io_flags(self.carga)

        if projeto and getattr(projeto, "possui_plc", False):
            if self.tipo_sinal == TipoSinalChoices.DIGITAL:
                self.carga.quantidade_entradas_digitais = 1

                if self.tipo_sensor == TipoSensorChoices.ENCODER:
                    self.carga.quantidade_entradas_rapidas = 1

            elif self.tipo_sinal == TipoSinalChoices.ANALOGICO:
                self.carga.quantidade_entradas_analogicas = 1

            elif self.tipo_sinal == TipoSinalChoices.ANALOGICO_DIGITAL:
                self.carga.quantidade_entradas_digitais = 1
                self.carga.quantidade_entradas_analogicas = 1

                if self.tipo_sensor == TipoSensorChoices.ENCODER:
                    self.carga.quantidade_entradas_rapidas = 1

        save_io_flags(self.carga)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self.sincronizar_quantidades_carga()