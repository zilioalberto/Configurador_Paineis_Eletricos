from decimal import Decimal

from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models

from core.choices import (
    TipoCargaChoices,
    TipoValvulaChoices,
    TensaoChoices,
    TipoCorrenteChoices,
    TipoProtecaoValvulaChoices,
    TipoAcionamentoValvulaChoices,
    TipoReleInterfaceValvulaChoices,
)

from .base import Carga
from .io_sync import reset_io_flags, save_io_flags


class CargaValvula(models.Model):
    carga = models.OneToOneField(
        Carga,
        on_delete=models.CASCADE,
        related_name="valvula",
        limit_choices_to={"tipo": TipoCargaChoices.VALVULA},
    )

    tipo_valvula = models.CharField(
        max_length=30,
        choices=TipoValvulaChoices.choices,
        default=TipoValvulaChoices.SOLENOIDE,
    )

    quantidade_vias = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    quantidade_posicoes = models.PositiveIntegerField(
        null=True,
        blank=True,
    )

    quantidade_solenoides = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Quantidade de solenoides da válvula.",
    )

    retorno_mola = models.BooleanField(default=False)
    possui_feedback = models.BooleanField(default=False)

    tensao_alimentacao = models.IntegerField(
        choices=TensaoChoices.choices,
        default=TensaoChoices.V24,
        help_text="Tensão de alimentação da válvula.",
    )

    tipo_corrente = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        default=TipoCorrenteChoices.CC,
        help_text="Tipo de corrente da alimentação da válvula.",
    )

    corrente_consumida_ma = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        default=Decimal("200.00"),
        validators=[MinValueValidator(Decimal("0.00"))],
        help_text="Corrente consumida pela válvula em mA.",
    )

    tipo_protecao = models.CharField(
        max_length=30,
        choices=TipoProtecaoValvulaChoices.choices,
        default=TipoProtecaoValvulaChoices.BORNE_FUSIVEL,
        help_text="Tipo de proteção elétrica da válvula.",
    )

    tipo_acionamento = models.CharField(
        max_length=30,
        choices=TipoAcionamentoValvulaChoices.choices,
        default=TipoAcionamentoValvulaChoices.SOLENOIDE_DIRETO,
        help_text="Tipo de acionamento da válvula.",
    )

    tipo_rele_interface = models.CharField(
        max_length=30,
        choices=TipoReleInterfaceValvulaChoices.choices,
        null=True,
        blank=True,
        help_text=(
            "Quando o acionamento é relé de interface: eletromecânico ou estado sólido."
        ),
    )

    class Meta:
        verbose_name = "Especificação de Válvula"
        verbose_name_plural = "Especificações de Válvulas"

    def __str__(self):
        return f"Válvula - {self.carga.tag}"

    def clean(self):
        erros = {}

        if self.carga and self.carga.tipo != TipoCargaChoices.VALVULA:
            erros["carga"] = "A carga vinculada deve ser do tipo VALVULA."

        if self.corrente_consumida_ma is not None and self.corrente_consumida_ma < 0:
            erros["corrente_consumida_ma"] = (
                "A corrente consumida não pode ser negativa."
            )

        if self.quantidade_solenoides < 1:
            erros["quantidade_solenoides"] = (
                "A quantidade de solenoides deve ser maior ou igual a 1."
            )

        if self.tipo_acionamento == TipoAcionamentoValvulaChoices.RELE_INTERFACE:
            if not self.tipo_rele_interface:
                erros["tipo_rele_interface"] = (
                    "Informe o tipo de relé de interface (eletromecânica ou estado sólido)."
                )
        elif self.tipo_rele_interface:
            erros["tipo_rele_interface"] = (
                "O tipo de relé de interface só se aplica ao acionamento "
                "\"Relé de interface\"."
            )

        if erros:
            raise ValidationError(erros)

    def sincronizar_quantidades_carga(self):
        """
        Válvula ocupa saídas digitais conforme a quantidade de solenoides.
        Se houver feedback, ocupa também entrada digital.
        Só marca IO quando o projeto possuir PLC.
        """
        if not self.carga:
            return

        projeto = self.carga.projeto

        reset_io_flags(self.carga)

        if projeto and getattr(projeto, "possui_plc", False):
            self.carga.quantidade_saidas_digitais = self.quantidade_solenoides

            if self.possui_feedback:
                self.carga.quantidade_entradas_digitais = 1

        save_io_flags(self.carga)

    def save(self, *args, **kwargs):
        if self.tipo_acionamento != TipoAcionamentoValvulaChoices.RELE_INTERFACE:
            self.tipo_rele_interface = None
        self.full_clean()
        super().save(*args, **kwargs)
        self.sincronizar_quantidades_carga()