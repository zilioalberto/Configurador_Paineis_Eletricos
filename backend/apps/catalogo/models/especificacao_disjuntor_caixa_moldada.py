from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.produtos import (
    ConfiguracaoDisparadorDisjuntorCMChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
)
from .base import Produto


class EspecificacaoDisjuntorCaixaMoldada(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_disjuntor_caixa_moldada",
    )

    corrente_nominal_a = models.DecimalField(max_digits=8, decimal_places=2)
    numero_polos = models.CharField(
        max_length=2,
        choices=NumeroPolosChoices.choices,
    )
    configuracao_disparador = models.CharField(
        max_length=64,
        choices=ConfiguracaoDisparadorDisjuntorCMChoices.choices,
    )
    capacidade_interrupcao_220v_ka = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Capacidade de interrupção em 220 V (kA).",
    )
    capacidade_interrupcao_380v_ka = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Capacidade de interrupção em 380 V (kA).",
    )
    capacidade_interrupcao_440v_ka = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Capacidade de interrupção em 440 V (kA).",
    )
    disparador_sobrecarga_ir_fixo_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Disparador de sobrecarga Ir (A) fixo.",
    )
    disparador_sobrecarga_ir_ajuste_min_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Disparador de sobrecarga Ir (A) ajustável - mínimo.",
    )
    disparador_sobrecarga_ir_ajuste_max_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Disparador de sobrecarga Ir (A) ajustável - máximo.",
    )
    disparador_curto_ii_fixo_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Disparador de curto-circuito Ii (A) fixo.",
    )
    disparador_curto_ii_ajuste_min_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Disparador de curto-circuito Ii (A) ajustável - mínimo.",
    )
    disparador_curto_ii_ajuste_max_a = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Disparador de curto-circuito Ii (A) ajustável - máximo.",
    )
    modo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
        default=ModoMontagemChoices.PLACA,
    )

    class Meta:
        verbose_name = "Especificação de Disjuntor Caixa Moldada"
        verbose_name_plural = "Especificações de Disjuntores Caixa Moldada"

    def clean(self):
        super().clean()
        if self.modo_montagem != ModoMontagemChoices.PLACA:
            raise ValidationError(
                {"modo_montagem": "Disjuntor caixa moldada deve ser montado em placa."}
            )

        capacidades = (
            self.capacidade_interrupcao_220v_ka,
            self.capacidade_interrupcao_380v_ka,
            self.capacidade_interrupcao_440v_ka,
        )
        if not any(v is not None for v in capacidades):
            raise ValidationError(
                "Informe ao menos uma capacidade de interrupção para 220V, 380V ou 440V."
            )

        usa_ir_ajustavel = self.configuracao_disparador == (
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO
        )
        usa_ii_ajustavel = self.configuracao_disparador == (
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_LI_II_AJUSTAVEL
        )

        if usa_ir_ajustavel:
            if (
                self.disparador_sobrecarga_ir_ajuste_min_a is None
                or self.disparador_sobrecarga_ir_ajuste_max_a is None
            ):
                raise ValidationError(
                    "Informe faixa ajustável de sobrecarga Ir para esta configuração."
                )
            if (
                self.disparador_sobrecarga_ir_ajuste_min_a
                > self.disparador_sobrecarga_ir_ajuste_max_a
            ):
                raise ValidationError(
                    "Ir mínimo não pode ser maior que Ir máximo."
                )
            if self.disparador_sobrecarga_ir_fixo_a is not None:
                raise ValidationError(
                    "Ir fixo não deve ser informado quando sobrecarga é ajustável."
                )
        else:
            if self.disparador_sobrecarga_ir_fixo_a is None:
                raise ValidationError(
                    "Informe Ir fixo para configurações com sobrecarga fixa."
                )
            if (
                self.disparador_sobrecarga_ir_ajuste_min_a is not None
                or self.disparador_sobrecarga_ir_ajuste_max_a is not None
            ):
                raise ValidationError(
                    "Faixa de Ir ajustável só deve ser informada para sobrecarga ajustável."
                )

        if usa_ii_ajustavel:
            if (
                self.disparador_curto_ii_ajuste_min_a is None
                or self.disparador_curto_ii_ajuste_max_a is None
            ):
                raise ValidationError(
                    "Informe faixa ajustável de curto-circuito Ii para esta configuração."
                )
            if self.disparador_curto_ii_ajuste_min_a > self.disparador_curto_ii_ajuste_max_a:
                raise ValidationError(
                    "Ii mínimo não pode ser maior que Ii máximo."
                )
            if self.disparador_curto_ii_fixo_a is not None:
                raise ValidationError(
                    "Ii fixo não deve ser informado quando curto-circuito é ajustável."
                )
        else:
            if self.disparador_curto_ii_fixo_a is None:
                raise ValidationError(
                    "Informe Ii fixo para configurações com curto-circuito fixo."
                )
            if (
                self.disparador_curto_ii_ajuste_min_a is not None
                or self.disparador_curto_ii_ajuste_max_a is not None
            ):
                raise ValidationError(
                    "Faixa de Ii ajustável só deve ser informada para curto-circuito ajustável."
                )

    def __str__(self):
        return f"Disjuntor CM - {self.produto} - {self.corrente_nominal_a} A"
