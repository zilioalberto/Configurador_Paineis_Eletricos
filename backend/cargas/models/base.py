from decimal import Decimal

from django.core.validators import MinValueValidator
from django.db import models

from core.models import BaseModel
from core.models.mixins import AtivacaoMixin
from projetos.models.base import Projeto
from core.choices import (
    TipoCargaChoices,
    TensaoChoices,
    TipoCorrenteChoices,
    NumeroFasesChoices,
    FrequenciaChoices,
)


class Carga(BaseModel, AtivacaoMixin):
    projeto = models.ForeignKey(
        Projeto,
        on_delete=models.CASCADE,
        related_name="cargas",
    )
    tag = models.CharField(
        max_length=50,
        help_text="Ex.: M01, YV01, R01, ST01",
    )
    descricao = models.CharField(
        max_length=255,
    )
    tipo = models.CharField(
        max_length=30,
        choices=TipoCargaChoices.choices,
    )

    quantidade = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
    )

    local_instalacao = models.CharField(
        max_length=100,
        blank=True,
        help_text="Ex.: Campo, skid, painel, área externa",
    )
    observacoes = models.TextField(blank=True)

    # Integração com dimensionamento/composição
    exige_protecao = models.BooleanField(default=True)
    exige_seccionamento = models.BooleanField(default=False)
    exige_comando = models.BooleanField(default=False)
    exige_fonte_auxiliar = models.BooleanField(default=False)

    ocupa_entrada_digital = models.BooleanField(default=False)
    ocupa_entrada_analogica = models.BooleanField(default=False)
    ocupa_saida_digital = models.BooleanField(default=False)
    ocupa_saida_analogica = models.BooleanField(default=False)

    class Meta:
        verbose_name = "Carga"
        verbose_name_plural = "Cargas"
        ordering = ["projeto", "tag"]
        constraints = [
            models.UniqueConstraint(
                fields=["projeto", "tag"],
                name="unique_tag_por_projeto",
            )
        ]

    def __str__(self):
        return f"{self.tag} - {self.descricao}"

    def save(self, *args, **kwargs):
        if self.tag:
            self.tag = self.tag.upper().strip()
        if self.descricao:
            self.descricao = self.descricao.upper().strip()
        if self.local_instalacao:
            self.local_instalacao = self.local_instalacao.upper().strip()
        super().save(*args, **kwargs)