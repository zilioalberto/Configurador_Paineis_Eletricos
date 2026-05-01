from decimal import Decimal
from math import sqrt

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
    TensaoChoices,
)

from .base import Carga
from .io_sync import reset_io_flags, save_io_flags


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

    numero_fases = models.IntegerField(
        choices=NumeroFasesChoices.choices,
        default=NumeroFasesChoices.TRIFASICO,
        help_text="Número de fases do motor.",
    )

    tensao_motor = models.IntegerField(
        choices=TensaoChoices.choices,
        help_text="Tensão nominal do motor.",
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
    tipo_conexao_painel = models.CharField(
        max_length=50,
        choices=TipoConexaoCargaPainelChoices.choices,
        default=TipoConexaoCargaPainelChoices.CONEXAO_BORNES_COM_PE,
        help_text="Tipo de conexão da carga no painel.",
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

        if self.numero_fases not in (
            NumeroFasesChoices.MONOFASICO,
            NumeroFasesChoices.TRIFASICO,
        ):
            erros["numero_fases"] = "Para motores, use apenas monofásico ou trifásico."

        if self.fator_potencia is not None and (
            self.fator_potencia <= 0 or self.fator_potencia > 1
        ):
            erros["fator_potencia"] = (
                "O fator de potência deve estar entre 0.01 e 1.00."
            )

        if self.rendimento_percentual is not None and (
            self.rendimento_percentual <= 0 or self.rendimento_percentual > 100
        ):
            erros["rendimento_percentual"] = (
                "O rendimento percentual deve estar entre 0.01 e 100.00."
            )

        projeto = self.carga.projeto if self.carga and self.carga.projeto else None

        if projeto and projeto.tensao_nominal and self.tensao_motor:
            partidas_com_tensao_do_projeto = (
                TipoPartidaMotorChoices.DIRETA,
                TipoPartidaMotorChoices.ESTRELA_TRIANGULO,
                TipoPartidaMotorChoices.SOFT_STARTER,
            )
            if self.tipo_partida in partidas_com_tensao_do_projeto:
                if self.numero_fases == NumeroFasesChoices.MONOFASICO:
                    tensao_esperada = int(round(projeto.tensao_nominal / sqrt(3)))
                    # Aceita pequena variação de arredondamento (ex.: 219V ~ 220V).
                    if abs(int(self.tensao_motor) - int(tensao_esperada)) > 1:
                        erros["tensao_motor"] = (
                            (
                                "A tensão do motor monofásico deve ser compatível com a "
                                f"tensão do projeto ({projeto.tensao_nominal} V), "
                                f"ficando próxima de {tensao_esperada} V "
                                "(tolerância ±1 V)."
                            )
                        )
                elif self.tensao_motor != projeto.tensao_nominal:
                    erros["tensao_motor"] = (
                        (
                            "A tensão do motor deve ser igual à tensão do projeto para "
                            "partida direta, estrela-triângulo e soft starter. "
                            f"Projeto: {projeto.tensao_nominal} V. "
                            f"Informado: {self.tensao_motor} V."
                        )
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

    def _calcular_corrente(self):
        if self.potencia_corrente_unidade == UnidadePotenciaCorrenteChoices.A:
            return self.potencia_corrente_valor

        potencia_kw = self._obter_potencia_kw()
        if potencia_kw is None:
            return None

        if self.tensao_motor is None or self.numero_fases is None:
            return None

        if self.fator_potencia is None or self.rendimento_percentual is None:
            return None

        rendimento_decimal = self.rendimento_percentual / Decimal("100")
        tensao_decimal = Decimal(str(self.tensao_motor))

        if self.numero_fases == NumeroFasesChoices.MONOFASICO:
            return calcular_corrente_monofasica(
                potencia_kw=potencia_kw,
                tensao_v=tensao_decimal,
                fator_potencia=self.fator_potencia,
                rendimento=rendimento_decimal,
            )

        if self.numero_fases == NumeroFasesChoices.TRIFASICO:
            return calcular_corrente_trifasica(
                potencia_kw=potencia_kw,
                tensao_v=tensao_decimal,
                fator_potencia=self.fator_potencia,
                rendimento=rendimento_decimal,
            )

        return None

    def sincronizar_quantidades_carga(self):
        """
        Atualiza as quantidades de IO da carga para motores.
        Regra:
        - Só computa IO quando projeto possui PLC e a carga exige comando.
        - Nessas condições, considera 1 saída digital por tipo de partida.
        - Fora dessas condições, mantém todas as quantidades zeradas.
        """
        if not self.carga:
            return

        projeto = self.carga.projeto

        reset_io_flags(self.carga)

        possui_plc = bool(projeto and getattr(projeto, "possui_plc", False))
        exige_comando = bool(getattr(self.carga, "exige_comando", False))

        if possui_plc and exige_comando:
            self.carga.quantidade_entradas_digitais = 1
            self.carga.quantidade_saidas_digitais = 1

        save_io_flags(self.carga)

    def save(self, *args, **kwargs):
        self.full_clean()
        self.potencia_kw_calculada = self._obter_potencia_kw()
        self.corrente_calculada_a = self._calcular_corrente()
        super().save(*args, **kwargs)
        self.sincronizar_quantidades_carga()