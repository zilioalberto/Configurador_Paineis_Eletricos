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
    TipoProtecaoMotorChoices,
    TipoConexaoCargaPainelChoices,
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
    
    tipo_protecao = models.CharField(
    max_length=30,
    choices=TipoProtecaoMotorChoices.choices,
    default=TipoProtecaoMotorChoices.DISJUNTOR_MOTOR,
    help_text="Tipo de proteção elétrica do motor.",
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

    tipo_conexao_painel = models.CharField(
        max_length=50,
        choices=TipoConexaoCargaPainelChoices.choices,
        default=TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE,
        help_text="Define como a carga será conectada ao painel elétrico.",
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
        if self.potencia_corrente_valor is None:
            print("Valor de potência/corrente não informado. Não é possível calcular a corrente.")
            return None

        tensao = self._obter_tensao_projeto()
        numero_fases = self._obter_numero_fases_projeto()
        print(f"Tensão do projeto: {tensao} V")
        print(f"Número de fases do projeto: {numero_fases}")

        if not tensao or not numero_fases:
            print("Tensão ou número de fases do projeto não informado. Não é possível calcular a corrente.")
            return None

        if self.potencia_corrente_unidade == UnidadePotenciaCorrenteChoices.A:
            print("Valor informado em Ampere. Retornando valor sem cálculo.")
            return self.potencia_corrente_valor

        if not self.fator_potencia or not self.rendimento_percentual:
            print("Fator de potência ou rendimento não informados. Não é possível calcular a corrente.")
            return None

        rendimento_decimal = self.rendimento_percentual / Decimal("100")
        tensao_decimal = Decimal(str(tensao))

        if self.potencia_corrente_unidade == UnidadePotenciaCorrenteChoices.KW:
            print("Valor informado em kW. Usando valor diretamente para cálculo.")
            potencia_kw = self.potencia_corrente_valor

        elif self.potencia_corrente_unidade == UnidadePotenciaCorrenteChoices.CV:
            print("Valor informado em CV. Convertendo diretamente para potência equivalente do cálculo.")
            potencia_kw = self.potencia_corrente_valor * Decimal("0.7355")

        else:
            print("Unidade informada inválida para cálculo.")
            return None

        if numero_fases == NumeroFasesChoices.MONOFASICO:
            corrente = calcular_corrente_monofasica(
                potencia_kw=potencia_kw,
                tensao_v=tensao_decimal,
                fator_potencia=self.fator_potencia,
                rendimento=rendimento_decimal,
            )
            print(f"Corrente monofásica calculada: {corrente} A")
            return corrente

        if numero_fases == NumeroFasesChoices.TRIFASICO:
            corrente = calcular_corrente_trifasica(
                potencia_kw=potencia_kw,
                tensao_v=tensao_decimal,
                fator_potencia=self.fator_potencia,
                rendimento=rendimento_decimal,
            )
            print(f"Corrente trifásica calculada: {corrente} A")
            return corrente

        print("Número de fases não suportado para cálculo.")
        return None


    def save(self, *args, **kwargs):
            self.full_clean()
            print("Calculando potência e corrente para o motor...")
            self.potencia_kw_calculada = self._obter_potencia_kw()
            self.corrente_calculada_a = self._calcular_corrente()
            print(f"Potência calculada: {self.potencia_kw_calculada} kW")
            print(f"Corrente calculada: {self.corrente_calculada_a} A")

            super().save(*args, **kwargs)