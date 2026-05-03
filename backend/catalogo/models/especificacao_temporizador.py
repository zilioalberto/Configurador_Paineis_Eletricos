from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.produtos import (
    TipoFuncaoTemporizadorChoices,
    TipoMontagemTemporizadorChoices,
    TipoTemporizadorChoices,
)
from .base import Produto


class EspecificacaoTemporizador(BaseModel):
    MODO_MONTAGEM_CHOICES = (
        (TipoMontagemTemporizadorChoices.TRILHO_DIN, "Trilho DIN"),
    )

    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_temporizador",
    )

    tipo_temporizador = models.CharField(
        max_length=20,
        choices=TipoTemporizadorChoices.choices,
        help_text="Tipo construtivo do temporizador.",
    )

    tipo_funcao = models.CharField(
        max_length=30,
        choices=TipoFuncaoTemporizadorChoices.choices,
        help_text="Função do temporizador.",
    )

    tensao_alimentacao_v = models.IntegerField(
        choices=TensaoIluminacaoBotaoChoices.choices,
        help_text="Tensão de alimentação (24, 110 ou 220 V).",
    )

    corrente_contato_a = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        help_text="Corrente suportada nos contatos.",
    )

    quantidade_contatos = models.PositiveIntegerField(default=1)

    tipo_montagem = models.CharField(
        max_length=30,
        choices=MODO_MONTAGEM_CHOICES,
        default=TipoMontagemTemporizadorChoices.TRILHO_DIN,
    )

    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Especificação de Temporizador"
        verbose_name_plural = "Especificações de Temporizadores"

    def __str__(self):
        return (
            f"Temporizador {self.get_tipo_funcao_display()} "
            f"{self.tensao_alimentacao_v}V"
        )
