from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.choices import (
    TipoCargaChoices,
    TipoTransdutorChoices,
    TipoSinaisAnalogicosChoices,
    TensaoChoices,
    TipoCorrenteChoices,
)

from .base import Carga
from .io_sync import reset_io_flags, save_io_flags


class CargaTransdutor(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="transdutor",
        limit_choices_to={"tipo": TipoCargaChoices.TRANSDUTOR},
    )

    tipo_transdutor = models.CharField(
        max_length=30,
        choices=TipoTransdutorChoices.choices,
    )

    faixa_medicao = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ex.: 0-10 bar, 0-100 °C, 0-5 m",
    )

    tipo_sinal_analogico = models.CharField(
        max_length=30,
        choices=TipoSinaisAnalogicosChoices.choices,
        null=True,
        blank=True,
    )

    precisao = models.CharField(
        max_length=50,
        blank=True,
        default="",
        help_text="Ex.: precisão declarada pelo fabricante.",
    )

    tensao_alimentacao = models.IntegerField(
        choices=TensaoChoices.choices,
        default=TensaoChoices.V24,
        help_text="Tensão de alimentação do transdutor.",
    )

    tipo_corrente = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        default=TipoCorrenteChoices.CC,
        help_text="Tipo de corrente da alimentação do transdutor.",
    )

    corrente_consumida_ma = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("20.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Corrente consumida pelo transdutor em mA.",
    )

    quantidade_fios = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Quantidade de fios do transdutor.",
    )

    class Meta:
        verbose_name = "Especificação de Transdutor"
        verbose_name_plural = "Especificações de Transdutores"

    def __str__(self):
        return f"Transdutor - {self.carga.tag}"

    def clean(self):
        erros = {}

        if self.carga and self.carga.tipo != TipoCargaChoices.TRANSDUTOR:
            erros["carga"] = "A carga vinculada deve ser do tipo TRANSDUTOR."

        if not self.tipo_sinal_analogico:
            erros["tipo_sinal_analogico"] = (
                "Informe o tipo de sinal analógico do transdutor."
            )

        if erros:
            raise ValidationError(erros)

    def sincronizar_quantidades_carga(self):
        """
        Transdutor → entrada analógica (quando houver PLC)
        """
        if not self.carga:
            return

        projeto = self.carga.projeto

        reset_io_flags(self.carga)

        if projeto and getattr(projeto, "possui_plc", False):
            self.carga.quantidade_entradas_analogicas = 1

        save_io_flags(self.carga)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        self.sincronizar_quantidades_carga()