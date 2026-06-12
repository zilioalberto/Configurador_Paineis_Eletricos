"""Validação do emitente/prestador em XMLs de documentos emitidos importados."""
from __future__ import annotations

from apps.fiscal.services.documento_emitido_parser import DocumentoEmitidoParserError
from apps.fiscal.services.fiscal_empresa import cnpj_empresa_fiscal_configurado
from apps.fiscal.utils import normalizar_cnpj


def validar_emitente_documento_emitido(emitente: dict[str, str]) -> None:
    """
    Garante que o XML é de saída emitida pela empresa configurada.
    NF-e: emitente; NFS-e: prestador de serviço.
    """
    try:
        cnpj_empresa = cnpj_empresa_fiscal_configurado()
    except Exception as exc:
        raise DocumentoEmitidoParserError(str(exc)) from exc
    cnpj_emitente = normalizar_cnpj(emitente.get("cnpj") or "")
    if not cnpj_emitente:
        raise DocumentoEmitidoParserError(
            "CNPJ do emitente/prestador não encontrado no XML."
        )
    if cnpj_emitente != cnpj_empresa:
        nome = (emitente.get("nome") or "").strip() or "sem razão social"
        raise DocumentoEmitidoParserError(
            f"Este XML não foi emitido pela empresa configurada (CNPJ {cnpj_empresa}). "
            f"Emitente no XML: {nome} (CNPJ {cnpj_emitente}). "
            "Importe apenas NF-es/NFS-es emitidas pela ZFW; notas de entrada de fornecedores "
            "devem ser importadas em NF-es recebidas."
        )
