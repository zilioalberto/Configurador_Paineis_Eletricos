"""Notificações internas exibidas no portal (sino do cabeçalho)."""
from __future__ import annotations

import uuid

from django.conf import settings
from django.db import models


class TipoNotificacaoInternaChoices(models.TextChoices):
    OFERTA_APROVADA_CLIENTE = "OFERTA_APROVADA_CLIENTE", "Oferta aprovada pelo cliente"
    OFERTA_REJEITADA_CLIENTE = "OFERTA_REJEITADA_CLIENTE", "Oferta recusada pelo cliente"


class NotificacaoInterna(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    destinatario = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notificacoes_internas",
    )
    tipo = models.CharField(max_length=40, choices=TipoNotificacaoInternaChoices.choices)
    titulo = models.CharField(max_length=200)
    mensagem = models.TextField(blank=True)
    link = models.CharField(max_length=500, blank=True)
    referencia_app = models.CharField(max_length=40, blank=True, db_index=True)
    referencia_id = models.UUIDField(null=True, blank=True, db_index=True)
    lida = models.BooleanField(default=False, db_index=True)
    lida_em = models.DateTimeField(null=True, blank=True)
    criado_em = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = "notificacao_interna"
        ordering = ("-criado_em",)
        indexes = [
            models.Index(
                fields=["destinatario", "lida", "-criado_em"],
                name="idx_notif_dest_lida_criado",
            ),
        ]

    def __str__(self) -> str:
        return f"{self.titulo} → {self.destinatario_id}"
