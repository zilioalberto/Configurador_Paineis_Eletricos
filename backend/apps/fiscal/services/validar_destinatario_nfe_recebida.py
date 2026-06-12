"""Validação do destinatário em XMLs de NF-es recebidas importadas manualmente."""
from __future__ import annotations

from apps.fiscal.services.fiscal_empresa import cnpj_empresa_fiscal_configurado
from apps.fiscal.services.nfe_parser import NFeParserError
from apps.fiscal.utils import normalizar_cnpj


def validar_destinatario_nfe_recebida(destinatario: dict[str, str]) -> None:
    """
    Garante que a NF-e de entrada foi emitida para a empresa configurada (ZFW).
    """
    cnpj_empresa = cnpj_empresa_fiscal_configurado()
    cnpj_destinatario = normalizar_cnpj(destinatario.get("cnpj") or "")
    if not cnpj_destinatario:
        raise NFeParserError("CNPJ do destinatário não encontrado no XML.")
    if cnpj_destinatario != cnpj_empresa:
        nome = (destinatario.get("nome") or "").strip() or "sem razão social"
        raise NFeParserError(
            f"Este XML não é destinado à empresa configurada (CNPJ {cnpj_empresa}). "
            f"Destinatário no XML: {nome} (CNPJ {cnpj_destinatario}). "
            "Importe apenas NF-es recebidas pela ZFW; notas emitidas pela empresa "
            "devem ser importadas em NF-es emitidas."
        )
