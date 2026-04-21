from decimal import Decimal
from math import sqrt

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.calculos.eletrica import (
    calcular_corrente_monofasica,
    calcular_corrente_trifasica,
)
from core.choices import (
    TipoCargaChoices,
    NumeroFasesChoices,
    TensaoChoices,
    TipoProtecaoResistenciaChoices,
    TipoAcionamentoResistenciaChoices,
)

from .base import Carga
from .io_sync import reset_io_flags, save_io_flags


class CargaResistencia(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="resistencia",
        limit_choices_to={"tipo": TipoCargaChoices.RESISTENCIA},
    )

    numero_fases = models.IntegerField(
        choices=NumeroFasesChoices.choices,
        default=NumeroFasesChoices.TRIFASICO,
        help_text="Número de fases da resistência.",
    )

    tensao_resistencia = models.IntegerField(
        choices=TensaoChoices.choices,
        help_text="Tensão nominal da resistência.",
    )

    tipo_protecao = models.CharField(
        max_length=30,
        choices=TipoProtecaoResistenciaChoices.choices,
        default=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        help_text="Tipo de proteção elétrica da resistência.",
    )

    tipo_acionamento = models.CharField(
        max_length=30,
        choices=TipoAcionamentoResistenciaChoices.choices,
        default=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        help_text="Tipo de acionamento da resistência.",
    )

    potencia_kw = models.DecimalField(
        max_digits=10,
        decimal_places=3,
        validators=[MinValueValidator(Decimal("0.001"))],
        help_text="Potência da resistência em kW.",
    )

    corrente_calculada_a = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        editable=False,
    )

    class Meta:
        verbose_name = "Especificação de Resistência"
        verbose_name_plural = "Especificações de Resistências"

    def __str__(self):
        return f"Resistência - {self.carga.tag}"

    def clean(self):
        erros = {}

        if self.carga and self.carga.tipo != TipoCargaChoices.RESISTENCIA:
            erros["carga"] = "A carga vinculada deve ser do tipo RESISTENCIA."

        if self.numero_fases not in (
            NumeroFasesChoices.MONOFASICO,
            NumeroFasesChoices.TRIFASICO,
        ):
            erros["numero_fases"] = (
                "Para resistência, use apenas monofásico ou trifásico."
            )

        if self.potencia_kw is not None and self.potencia_kw <= 0:
            erros["potencia_kw"] = "A potência deve ser maior que zero."

        if not self.tensao_resistencia:
            erros["tensao_resistencia"] = "Informe a tensão da resistência."

        projeto = self.carga.projeto if self.carga and self.carga.projeto else None
        if projeto and projeto.tensao_nominal and self.tensao_resistencia:
            projeto_trifasico = (
                getattr(projeto, "numero_fases", None) == NumeroFasesChoices.TRIFASICO
            )
            resistencia_monofasica = (
                self.numero_fases == NumeroFasesChoices.MONOFASICO
            )

            if projeto_trifasico and resistencia_monofasica:
                tensao_esperada = Decimal(str(projeto.tensao_nominal)) / Decimal(
                    str(sqrt(3))
                )
                tolerancia = tensao_esperada * Decimal("0.02")
                tensao_minima = tensao_esperada - tolerancia
                tensao_maxima = tensao_esperada + tolerancia
                tensao_informada = Decimal(str(self.tensao_resistencia))

                if not (tensao_minima <= tensao_informada <= tensao_maxima):
                    erros["tensao_resistencia"] = (
                        (
                            "A tensão da resistência monofásica deve ser compatível com a "
                            f"tensão do projeto ({projeto.tensao_nominal} V), "
                            f"ficando próxima de {tensao_esperada:.2f} V "
                            "(tolerância de 2%)."
                        )
                    )
            elif self.tensao_resistencia != projeto.tensao_nominal:
                erros["tensao_resistencia"] = (
                    (
                        "A tensão da resistência deve ser igual à tensão do projeto. "
                        f"Projeto: {projeto.tensao_nominal} V. "
                        f"Informado: {self.tensao_resistencia} V."
                    )
                )

        if erros:
            raise ValidationError(erros)

    def _calcular_corrente(self):
        if self.potencia_kw is None or self.tensao_resistencia is None:
            return None

        tensao_decimal = Decimal(str(self.tensao_resistencia))

        if self.numero_fases == NumeroFasesChoices.MONOFASICO:
            return calcular_corrente_monofasica(
                potencia_kw=self.potencia_kw,
                tensao_v=tensao_decimal,
                fator_potencia=Decimal("1.00"),
                rendimento=Decimal("1.00"),
            )

        if self.numero_fases == NumeroFasesChoices.TRIFASICO:
            return calcular_corrente_trifasica(
                potencia_kw=self.potencia_kw,
                tensao_v=tensao_decimal,
                fator_potencia=Decimal("1.00"),
                rendimento=Decimal("1.00"),
            )

        return None

    def sincronizar_quantidades_carga(self):
        """
        Atualiza as quantidades de IO da carga com base no tipo de acionamento da resistência.
        Só marca IO quando o projeto possuir PLC.
        """
        if not self.carga:
            return

        projeto = self.carga.projeto

        reset_io_flags(self.carga)

        if projeto and getattr(projeto, "possui_plc", False):
            if self.tipo_acionamento == TipoAcionamentoResistenciaChoices.CONTATOR:
                self.carga.quantidade_saidas_digitais = 1

            elif self.tipo_acionamento == TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO:
                self.carga.quantidade_saidas_digitais = 1

        save_io_flags(self.carga)

    def save(self, *args, **kwargs):
        self.full_clean()
        self.corrente_calculada_a = self._calcular_corrente()
        super().save(*args, **kwargs)
        self.sincronizar_quantidades_carga()