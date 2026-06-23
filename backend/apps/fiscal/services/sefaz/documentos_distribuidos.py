"""Persistência da caixa de entrada de documentos distribuídos pela SEFAZ."""
from __future__ import annotations

from dataclasses import dataclass

from apps.fiscal.choices import (
    StatusDocumentoSefazDistribuidoChoices,
    TipoDocumentoSefazDistribuidoChoices,
)
from apps.fiscal.models import DocumentoFiscalRecebido, DocumentoSefazDistribuido
from apps.fiscal.services.sefaz.parse_dist_dfe import DistDfeResumoNfe
from apps.fiscal.utils import normalizar_cnpj


@dataclass(frozen=True)
class ResultadoResumoDistribuido:
    created: bool
    documento: DocumentoSefazDistribuido


def salvar_resumo_nfe_distribuido(
    resumo: DistDfeResumoNfe,
    *,
    cnpj_destinatario: str,
) -> ResultadoResumoDistribuido:
    """Salva/atualiza um resNFe recebido pela Distribuição DFe."""
    defaults = {
        "nsu": resumo.nsu,
        "schema": resumo.schema,
        "tipo_documento": TipoDocumentoSefazDistribuidoChoices.RESUMO_NFE,
        "status": StatusDocumentoSefazDistribuidoChoices.RESUMO_RECEBIDO,
        "cnpj_emitente": resumo.cnpj_emitente,
        "nome_emitente": resumo.nome_emitente,
        "cnpj_destinatario": normalizar_cnpj(cnpj_destinatario),
        "data_emissao": resumo.data_emissao,
        "valor_total": resumo.valor_total,
        "situacao_nfe": resumo.situacao_nfe,
        "protocolo": resumo.protocolo,
        "recebido_em_sefaz": resumo.recebido_em_sefaz,
        "xml_resumo": resumo.xml,
        "ultimo_erro": "",
    }
    documento, created = DocumentoSefazDistribuido.objects.update_or_create(
        chave_acesso=resumo.chave_acesso,
        defaults=defaults,
    )
    return ResultadoResumoDistribuido(created=created, documento=documento)


def vincular_xml_completo_distribuido(
    *,
    documento_recebido: DocumentoFiscalRecebido,
    xml: str,
    nsu: str | None,
    schema: str | None,
) -> None:
    """Marca a distribuição como importada quando chega o XML completo."""
    DocumentoSefazDistribuido.objects.update_or_create(
        chave_acesso=documento_recebido.chave_acesso,
        defaults={
            "nsu": nsu or documento_recebido.nsu,
            "schema": schema or "",
            "tipo_documento": TipoDocumentoSefazDistribuidoChoices.NFE_COMPLETA,
            "status": StatusDocumentoSefazDistribuidoChoices.XML_IMPORTADO,
            "cnpj_emitente": documento_recebido.cnpj_emitente,
            "nome_emitente": documento_recebido.nome_emitente,
            "cnpj_destinatario": documento_recebido.cnpj_destinatario,
            "nome_destinatario": documento_recebido.nome_destinatario,
            "data_emissao": documento_recebido.data_emissao,
            "valor_total": documento_recebido.valor_total,
            "documento_recebido": documento_recebido,
            "xml_completo": xml,
            "ultimo_erro": "",
        },
    )
