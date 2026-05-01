from django.core.exceptions import ValidationError
from django.db import models

from core.models import BaseModel
from core.choices.paineis import (
    AcabamentoPlacaPainelChoices,
    CorPainelChoices,
    MaterialPainelChoices,
    TipoInstalacaoPainelChoices,
    TipoPainelCatalogoChoices,
)
from .base import Produto


class EspecificacaoPainel(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_painel",
    )

    tipo_painel = models.CharField(
        max_length=30,
        choices=TipoPainelCatalogoChoices.choices,
    )

    tipo_instalacao = models.CharField(
        max_length=30,
        choices=TipoInstalacaoPainelChoices.choices,
    )

    material = models.CharField(
        max_length=30,
        choices=MaterialPainelChoices.choices,
    )

    grau_protecao_ip = models.CharField(
        max_length=10,
        blank=True,
        help_text="Ex.: IP54, IP55, IP65.",
    )

    placa_largura_util_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Largura útil da placa de montagem.",
    )

    placa_altura_util_mm = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Altura útil da placa de montagem.",
    )

    placa_acabamento = models.CharField(
        max_length=30,
        choices=AcabamentoPlacaPainelChoices.choices,
        default=AcabamentoPlacaPainelChoices.GALVANIZADA,
    )

    cor = models.CharField(
        max_length=20,
        choices=CorPainelChoices.choices,
        null=True,
        blank=True,
        default=None,
    )

    possui_flange = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Especificação de Painel"
        verbose_name_plural = "Especificações de Painéis"

    def clean(self):
        super().clean()

        if self.material == MaterialPainelChoices.ACO_INOX:
            self.cor = None
        elif not self.cor:
            self.cor = CorPainelChoices.RAL7035

        for medida in (
            self.placa_largura_util_mm,
            self.placa_altura_util_mm,
        ):
            if medida is not None and medida <= 0:
                raise ValidationError(
                    "Dimensões úteis e da placa devem ser maiores que zero quando informadas."
                )

    def __str__(self):
        return f"{self.produto} - {self.tipo_painel} - {self.grau_protecao_ip}"
