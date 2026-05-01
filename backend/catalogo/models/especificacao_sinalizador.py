from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.produtos import CorSinalizadorChoices
from .base import Produto


class EspecificacaoSinalizador(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_sinalizador",
    )

    tensao_comando_v = models.IntegerField(
        choices=TensaoIluminacaoBotaoChoices.choices,
    )
    cor = models.CharField(max_length=20, choices=CorSinalizadorChoices.choices)

    class Meta:
        verbose_name = "Especificação de Sinalizador"
        verbose_name_plural = "Especificações de Sinalizadores"

    def __str__(self):
        return f"Sinalizador - {self.produto}"
