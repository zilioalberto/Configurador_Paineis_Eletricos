from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.calculos.conversoes import normalizar_para_kw

from core.calculos.eletrica import (
    calcular_corrente_monofasica,
    calcular_corrente_trifasica,
)
from core.choices import (
    TipoCargaChoices,
    TipoPartidaMotorChoices,
    UnidadePotenciaCorrenteChoices,
    NumeroFasesChoices,
)
from .base import Carga


class CargaMotor(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="motor",
        limit_choices_to={"tipo": TipoCargaChoices.MOTOR},
    )

    potencia_corrente_valor = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Valor informado em CV, kW ou A.",
    )

    potencia_corrente_unidade = models.CharField(
        max_length=5,
        choices=UnidadePotenciaCorrenteChoices.choices,
        default=UnidadePotenciaCorrenteChoices.CV,
        help_text="Unidade do valor informado.",
    )

    rendimento_percentual = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        null=True,
        blank=True,
        default=Decimal("85.00"),
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Rendimento do motor em percentual. Ex.: 85.00",
    )

    fator_potencia = models.DecimalField(
        max_digits=4,
        decimal_places=2,
        null=True,
        blank=True,
        default=Decimal("0.85"),
        validators=[MinValueValidator(Decimal("0.01"))],
        help_text="Fator de potência em formato decimal. Ex.: 0.85",
    )

    tipo_partida = models.CharField(
        max_length=30,
        choices=TipoPartidaMotorChoices.choices,
        default=TipoPartidaMotorChoices.DIRETA,
    )

    reversivel = models.BooleanField(default=False)
    freio_motor = models.BooleanField(default=False)

    tempo_partida_s = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.00"))],
    )

    potencia_kw_calculada = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        null=True,
        blank=True,
        editable=False,
    )

    corrente_calculada_a = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        editable=False,
    )

    class Meta:
        verbose_name = "Especificação de Motor"
        verbose_name_plural = "Especificações de Motores"

    def __str__(self):
        return f"Motor - {self.carga.tag}"

    def clean(self):
        erros = {}

        if self.carga and self.carga.tipo != TipoCargaChoices.MOTOR:
            erros["carga"] = "A carga vinculada deve ser do tipo MOTOR."

        if self.fator_potencia is not None:
            if self.fator_potencia <= 0 or self.fator_potencia > 1:
                erros["fator_potencia"] = (
                    "O fator de potência deve estar entre 0.01 e 1.00."
                )

        if self.rendimento_percentual is not None:
            if self.rendimento_percentual <= 0 or self.rendimento_percentual > 100:
                erros["rendimento_percentual"] = (
                    "O rendimento percentual deve estar entre 0.01 e 100.00."
                )

        if erros:
            raise ValidationError(erros)

    def _obter_potencia_kw(self):
        if self.potencia_corrente_unidade == UnidadePotenciaCorrenteChoices.KW:
            return self.potencia_corrente_valor

        if self.potencia_corrente_unidade == UnidadePotenciaCorrenteChoices.CV:
            return normalizar_para_kw(
                valor=self.potencia_corrente_valor,
                unidade=self.potencia_corrente_unidade,
            )

        return None

    def _obter_tensao_projeto(self):
        if self.carga and self.carga.projeto:
            return self.carga.projeto.tensao_nominal
        return None


    def _obter_numero_fases_projeto(self):
        if self.carga and self.carga.projeto:
            return self.carga.projeto.numero_fases
        return None


    def _calcular_corrente(self):
        if self.potencia_corrente_unidade == UnidadePotenciaCorrenteChoices.A:
            return self.potencia_corrente_valor

        potencia_kw = self._obter_potencia_kw()
        if potencia_kw is None:
            return None

        tensao = self._obter_tensao_projeto()
        numero_fases = self._obter_numero_fases_projeto()

        if not tensao or not numero_fases:
            return None

        if not self.fator_potencia or not self.rendimento_percentual:
            return None

        rendimento_decimal = self.rendimento_percentual / Decimal("100")
        tensao_decimal = Decimal(str(tensao))

        if numero_fases == NumeroFasesChoices.MONOFASICO:
            return calcular_corrente_monofasica(
                potencia_kw=potencia_kw,
                tensao_v=tensao_decimal,
                fator_potencia=self.fator_potencia,
                rendimento=rendimento_decimal,
            )

        if numero_fases == NumeroFasesChoices.TRIFASICO:
            return calcular_corrente_trifasica(
                potencia_kw=potencia_kw,
                tensao_v=tensao_decimal,
                fator_potencia=self.fator_potencia,
                rendimento=rendimento_decimal,
            )

        return None

    def save(self, *args, **kwargs):
            self.full_clean()

            self.potencia_kw_calculada = self._obter_potencia_kw()
            self.corrente_calculada_a = self._calcular_corrente()

            super().save(*args, **kwargs)