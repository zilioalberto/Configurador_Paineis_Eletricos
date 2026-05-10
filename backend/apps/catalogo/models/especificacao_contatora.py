from django.db import models
from django.core.exceptions import ValidationError

from core.models import BaseModel
from .base import Produto
from core.choices.produtos import ModoMontagemChoices
from core.choices.eletrica import TensaoChoices, TipoCorrenteChoices


class EspecificacaoContatora(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_contatora",
    )

    corrente_ac3_a = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    corrente_ac1_a = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    tensao_bobina_v = models.IntegerField(
        choices=TensaoChoices.choices,
        default=TensaoChoices.V24,
    )

    tipo_corrente_bobina = models.CharField(
        max_length=2,
        choices=TipoCorrenteChoices.choices,
        default=TipoCorrenteChoices.CC,
    )

    contatos_aux_na = models.PositiveSmallIntegerField(default=0)
    contatos_aux_nf = models.PositiveSmallIntegerField(default=0)

    modo_montagem = models.CharField(
        max_length=20,
        choices=ModoMontagemChoices.choices,
    )

    class Meta:
        verbose_name = "Especificação de Contatora"
        verbose_name_plural = "Especificações de Contatoras"

    def clean(self):
        super().clean()

        if self.corrente_ac3_a is None and self.corrente_ac1_a is None:
            raise ValidationError(
                "Informe pelo menos uma das correntes da contatora: AC-3 ou AC-1."
            )

    def __str__(self):
        return (
            f"Contatora - {self.produto} - "
            f"Bobina {self.tensao_bobina_v}V {self.tipo_corrente_bobina}"
        )