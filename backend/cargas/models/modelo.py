from django.conf import settings
from django.db import models

from core.choices import TipoCargaChoices
from core.models import BaseModel


class CargaModelo(BaseModel):
    nome = models.CharField(max_length=120, unique=True)
    tipo = models.CharField(max_length=30, choices=TipoCargaChoices.choices)
    payload = models.JSONField(default=dict, blank=True)
    ativo = models.BooleanField(default=True)
    criado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="carga_modelos_criados",
    )
    atualizado_por = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="carga_modelos_atualizados",
    )

    class Meta:
        verbose_name = "Modelo de carga"
        verbose_name_plural = "Modelos de carga"
        ordering = ["nome"]
        indexes = [
            models.Index(fields=["ativo", "tipo"]),
        ]

    def __str__(self):
        return self.nome
