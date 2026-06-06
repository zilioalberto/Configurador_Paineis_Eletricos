"""Choices do módulo fiscal (documentos recebidos)."""
from django.db import models


class StatusImportacaoFiscalChoices(models.TextChoices):
    RECEBIDA = "RECEBIDA", "Recebida"
    PROCESSADA = "PROCESSADA", "Processada"
    ERRO = "ERRO", "Erro"
    IGNORADA = "IGNORADA", "Ignorada"


class OrigemImportacaoFiscalChoices(models.TextChoices):
    MANUAL = "MANUAL", "Manual"
    PONTE_A3 = "PONTE_A3", "Ponte A3"
    API = "API", "API"
    OUTRO = "OUTRO", "Outro"


class TipoManifestacaoDestinatarioChoices(models.TextChoices):
    """tpEvento SEFAZ — manifestação do destinatário."""

    CIENCIA = "CIENCIA", "Ciência da operação"
    CONFIRMACAO = "CONFIRMACAO", "Confirmação da operação"
    DESCONHECIMENTO = "DESCONHECIMENTO", "Desconhecimento da operação"
    NAO_REALIZADA = "NAO_REALIZADA", "Operação não realizada"


class StatusManifestacaoDestinatarioChoices(models.TextChoices):
    NAO_SOLICITADA = "NAO_SOLICITADA", "Não solicitada"
    PENDENTE = "PENDENTE", "Pendente (aguarda ponte A3)"
    MANIFESTADA = "MANIFESTADA", "Registrada na SEFAZ"
    ERRO = "ERRO", "Erro na última tentativa"


# tpEvento oficial (layout evento NF-e)
TP_EVENTO_MANIFESTACAO = {
    TipoManifestacaoDestinatarioChoices.CIENCIA: "210210",
    TipoManifestacaoDestinatarioChoices.CONFIRMACAO: "210200",
    TipoManifestacaoDestinatarioChoices.DESCONHECIMENTO: "210220",
    TipoManifestacaoDestinatarioChoices.NAO_REALIZADA: "210240",
}
