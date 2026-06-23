"""Solicitação e registro de manifestação do destinatário (NF-e)."""
from __future__ import annotations

from django.db import transaction
from django.utils import timezone

from apps.fiscal.choices import (
    StatusDocumentoSefazDistribuidoChoices,
    StatusManifestacaoDestinatarioChoices,
    TipoManifestacaoDestinatarioChoices,
)
from apps.fiscal.models import DocumentoFiscalRecebido, DocumentoSefazDistribuido

_JUSTIFICATIVA_MIN = 15

# Após confirmação, não permite ciência/desconhecimento (regra SEFAZ simplificada)
_TIPOS_BLOQUEADOS_APOS = {
    TipoManifestacaoDestinatarioChoices.CONFIRMACAO: {
        TipoManifestacaoDestinatarioChoices.CIENCIA,
        TipoManifestacaoDestinatarioChoices.DESCONHECIMENTO,
    },
    TipoManifestacaoDestinatarioChoices.NAO_REALIZADA: {
        TipoManifestacaoDestinatarioChoices.CIENCIA,
        TipoManifestacaoDestinatarioChoices.CONFIRMACAO,
        TipoManifestacaoDestinatarioChoices.DESCONHECIMENTO,
    },
}


class ManifestacaoDestinatarioError(Exception):
    """Erro de validação ou negócio na manifestação."""


DocumentoManifestavel = DocumentoFiscalRecebido | DocumentoSefazDistribuido


def _tipo_ja_manifestado(documento: DocumentoManifestavel, tipo: str) -> bool:
    return (
        documento.manifestacao_status == StatusManifestacaoDestinatarioChoices.MANIFESTADA
        and documento.manifestacao_tipo == tipo
    )


def _validar_transicao(documento: DocumentoManifestavel, tipo: str) -> None:
    if documento.manifestacao_status == StatusManifestacaoDestinatarioChoices.PENDENTE:
        raise ManifestacaoDestinatarioError(
            "Já existe manifestação pendente. Aguarde a sincronização SEFAZ (fiscal_sync_nsu)."
        )
    if _tipo_ja_manifestado(documento, tipo):
        raise ManifestacaoDestinatarioError(f"Tipo {tipo} já registrado para esta NF-e.")
    tipo_atual = documento.manifestacao_tipo
    if (
        documento.manifestacao_status == StatusManifestacaoDestinatarioChoices.MANIFESTADA
        and tipo_atual
    ):
        bloqueados = _TIPOS_BLOQUEADOS_APOS.get(tipo_atual, set())
        if tipo in bloqueados:
            raise ManifestacaoDestinatarioError(
                f"Não é possível solicitar {tipo} após {tipo_atual} já manifestado."
            )


@transaction.atomic
def solicitar_manifestacao_destinatario(
    documento: DocumentoManifestavel,
    *,
    tipo: str,
    justificativa: str = "",
) -> DocumentoManifestavel:
    if tipo not in TipoManifestacaoDestinatarioChoices.values:
        raise ManifestacaoDestinatarioError("Tipo de manifestação inválido.")
    if not (documento.chave_acesso or "").strip():
        raise ManifestacaoDestinatarioError("Documento sem chave de acesso.")

    _validar_transicao(documento, tipo)

    justificativa = (justificativa or "").strip()
    if tipo == TipoManifestacaoDestinatarioChoices.NAO_REALIZADA:
        if len(justificativa) < _JUSTIFICATIVA_MIN:
            raise ManifestacaoDestinatarioError(
                f"Justificativa obrigatória (mínimo {_JUSTIFICATIVA_MIN} caracteres) "
                "para operação não realizada."
            )

    documento.manifestacao_status = StatusManifestacaoDestinatarioChoices.PENDENTE
    documento.manifestacao_tipo = tipo
    documento.manifestacao_justificativa = justificativa
    documento.manifestacao_protocolo = ""
    documento.manifestacao_cstat = ""
    documento.manifestacao_motivo = ""
    documento.manifestacao_solicitada_em = timezone.now()
    update_fields = [
        "manifestacao_status",
        "manifestacao_tipo",
        "manifestacao_justificativa",
        "manifestacao_protocolo",
        "manifestacao_cstat",
        "manifestacao_motivo",
        "manifestacao_solicitada_em",
    ]
    if isinstance(documento, DocumentoSefazDistribuido):
        update_fields.append("atualizado_em")
    else:
        update_fields.append("atualizada_em")
    documento.save(update_fields=update_fields)
    if isinstance(documento, DocumentoSefazDistribuido):
        documento.status = StatusDocumentoSefazDistribuidoChoices.AGUARDANDO_MANIFESTACAO
        documento.ultimo_erro = ""
        documento.save(update_fields=["status", "ultimo_erro", "atualizado_em"])
    return documento


@transaction.atomic
def registrar_resultado_manifestacao(
    documento: DocumentoManifestavel,
    *,
    sucesso: bool,
    protocolo: str = "",
    cstat: str = "",
    motivo: str = "",
    mensagem_erro: str = "",
) -> DocumentoManifestavel:
    if documento.manifestacao_status != StatusManifestacaoDestinatarioChoices.PENDENTE:
        raise ManifestacaoDestinatarioError("Documento não está com manifestação pendente.")

    agora = timezone.now()
    if sucesso:
        documento.manifestacao_status = StatusManifestacaoDestinatarioChoices.MANIFESTADA
        documento.manifestacao_protocolo = (protocolo or "")[:60]
        documento.manifestacao_cstat = (cstat or "")[:10]
        documento.manifestacao_motivo = (motivo or "")[:255]
        documento.manifestacao_registrada_em = agora
        from apps.fiscal.choices import StatusImportacaoFiscalChoices

        if isinstance(documento, DocumentoSefazDistribuido):
            documento.status = StatusDocumentoSefazDistribuidoChoices.MANIFESTADO
            documento.ultimo_erro = ""
        elif documento.status_importacao == StatusImportacaoFiscalChoices.RECEBIDA:
            documento.status_importacao = StatusImportacaoFiscalChoices.PROCESSADA
    else:
        documento.manifestacao_status = StatusManifestacaoDestinatarioChoices.ERRO
        documento.manifestacao_motivo = (mensagem_erro or motivo or "Erro na manifestação")[:255]
        documento.manifestacao_cstat = (cstat or "")[:10]
        if isinstance(documento, DocumentoSefazDistribuido):
            documento.status = StatusDocumentoSefazDistribuidoChoices.ERRO
            documento.ultimo_erro = documento.manifestacao_motivo

    documento.save()
    return documento
