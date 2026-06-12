"""Consultas de documentos fiscais com CNPJ divergente da empresa configurada."""
from __future__ import annotations

from django.conf import settings

from apps.fiscal.models import DocumentoFiscalEmitido, DocumentoFiscalRecebido
from apps.fiscal.utils import normalizar_cnpj


def cnpj_empresa_fiscal() -> str:
    """CNPJ da ZFW em FISCAL_EMPRESA_CNPJ (somente dígitos)."""
    return normalizar_cnpj(getattr(settings, "FISCAL_EMPRESA_CNPJ", "") or "")


def queryset_emitidas_emitente_divergente():
    """NF-es/NFS-es emitidas importadas com emitente/prestador ≠ empresa configurada."""
    cnpj_empresa = cnpj_empresa_fiscal()
    if len(cnpj_empresa) != 14:
        return DocumentoFiscalEmitido.objects.none()
    return (
        DocumentoFiscalEmitido.objects.exclude(cnpj_emitente=cnpj_empresa)
        .order_by("-data_emissao", "-criada_em")
    )


def queryset_recebidas_destinatario_divergente():
    """NF-es recebidas importadas com destinatário ≠ empresa configurada."""
    cnpj_empresa = cnpj_empresa_fiscal()
    if len(cnpj_empresa) != 14:
        return DocumentoFiscalRecebido.objects.none()
    return (
        DocumentoFiscalRecebido.objects.exclude(cnpj_destinatario=cnpj_empresa)
        .order_by("-data_emissao", "-criada_em")
    )
