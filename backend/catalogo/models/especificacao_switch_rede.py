from django.db import models

from core.models import BaseModel
from core.choices.eletrica import TensaoChoices
from core.choices.produtos import (
    TipoMontagemSwitchChoices,
    TipoPortaRedeChoices,
    TipoSwitchRedeChoices,
    VelocidadePortaRedeChoices,
)
from .base import Produto


class EspecificacaoSwitchRede(BaseModel):
    produto = models.OneToOneField(
        Produto,
        on_delete=models.CASCADE,
        related_name="especificacao_switch_rede",
    )

    tipo_switch = models.CharField(
        max_length=30,
        choices=TipoSwitchRedeChoices.choices,
        help_text="Tipo do switch de rede.",
    )

    quantidade_portas = models.PositiveIntegerField(
        help_text="Quantidade total de portas do switch.",
    )

    quantidade_portas_rj45 = models.PositiveIntegerField(
        default=0,
        help_text="Quantidade de portas RJ45.",
    )

    quantidade_portas_fibra = models.PositiveIntegerField(
        default=0,
        help_text="Quantidade de portas de fibra óptica.",
    )

    tipo_porta = models.CharField(
        max_length=30,
        choices=TipoPortaRedeChoices.choices,
        blank=True,
        null=True,
    )

    velocidade_porta = models.CharField(
        max_length=20,
        choices=VelocidadePortaRedeChoices.choices,
        blank=True,
        null=True,
    )

    tensao_alimentacao_v = models.IntegerField(
        choices=TensaoChoices.choices,
        blank=True,
        null=True,
        help_text="Tensão de alimentação do switch.",
    )

    corrente_nominal_a = models.DecimalField(
        max_digits=6,
        decimal_places=3,
        blank=True,
        null=True,
        help_text="Corrente nominal consumida.",
    )

    possui_poe = models.BooleanField(
        default=False,
        help_text="Indica se possui PoE.",
    )

    quantidade_portas_poe = models.PositiveIntegerField(
        default=0,
        help_text="Quantidade de portas PoE.",
    )

    gerenciavel = models.BooleanField(
        default=False,
        help_text="Indica se o switch é gerenciável.",
    )

    suporta_vlan = models.BooleanField(default=False)
    suporta_rstp = models.BooleanField(default=False)
    suporta_mrp = models.BooleanField(
        default=False,
        help_text="Suporte a MRP, comum em redes Profinet.",
    )

    suporta_profinet = models.BooleanField(default=False)
    suporta_ethernet_ip = models.BooleanField(default=False)
    suporta_modbus_tcp = models.BooleanField(default=False)

    tipo_montagem = models.CharField(
        max_length=30,
        choices=TipoMontagemSwitchChoices.choices,
        blank=True,
        null=True,
    )

    grau_protecao_ip = models.CharField(max_length=10, blank=True, null=True)

    largura_mm = models.PositiveIntegerField(blank=True, null=True)
    altura_mm = models.PositiveIntegerField(blank=True, null=True)
    profundidade_mm = models.PositiveIntegerField(blank=True, null=True)

    observacoes = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = "Especificação de Switch de Rede"
        verbose_name_plural = "Especificações de Switches de Rede"

    def __str__(self):
        return f"Switch {self.quantidade_portas} portas - {self.tipo_switch}"
