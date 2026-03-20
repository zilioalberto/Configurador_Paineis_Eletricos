from django.db import models

from core.models import BaseModel
from core.models.mixins import AtivacaoMixin
from core.choices import TensaoChoices, NumeroFasesChoices, FrequenciaChoices


class Projeto(BaseModel, AtivacaoMixin):
    codigo = models.CharField(
        max_length=50,
        unique=True,
        help_text="Código interno do projeto. Ex.: PRJ-0001",
    )
    nome = models.CharField(
        max_length=255,
        help_text="Nome resumido do projeto.",
    )
    descricao = models.TextField(
        blank=True,
        help_text="Descrição opcional do projeto.",
    )
    cliente = models.CharField(
        max_length=255,
        blank=True,
        help_text="Nome do cliente, provisoriamente em texto.",
    )

    tensao_nominal = models.IntegerField(
        choices=TensaoChoices.choices,
        null=True,
        blank=True,
        help_text="Tensão principal do projeto/painel.",
    )

    numero_fases = models.IntegerField(
        choices=NumeroFasesChoices.choices,
        null=True,
        blank=True,
        help_text="Número de fases da alimentação principal.",
    )

    frequencia = models.IntegerField(
        choices=FrequenciaChoices.choices,
        null=True,
        blank=True,
        default=FrequenciaChoices.HZ60,
        help_text="Frequência da alimentação principal.",
    )

    class Meta:
        verbose_name = "Projeto"
        verbose_name_plural = "Projetos"
        ordering = ["codigo", "nome"]

    def __str__(self):
        return f"{self.codigo} - {self.nome}"

    def save(self, *args, **kwargs):
        if self.codigo:
            self.codigo = self.codigo.upper().strip()
        if self.nome:
            self.nome = self.nome.upper().strip()
        if self.cliente:
            self.cliente = self.cliente.upper().strip()
        super().save(*args, **kwargs)