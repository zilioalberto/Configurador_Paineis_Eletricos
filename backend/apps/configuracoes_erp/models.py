"""Modelo e API de parâmetros globais do ERP (chave/valor)."""
from django.db import models


class ParametroConfiguracao(models.Model):
    """
    Parâmetros genéricos (numeração, flags, JSON em texto).
    Evoluir para tipos tipados ou namespaces por domínio.
    """

    id = models.BigAutoField(primary_key=True)
    chave = models.CharField(max_length=120, unique=True, db_index=True)
    valor = models.TextField(blank=True)
    descricao = models.CharField(max_length=255, blank=True)
    atualizado_em = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "erp_parametro_configuracao"
        ordering = ("chave",)

    def __str__(self) -> str:
        return self.chave
