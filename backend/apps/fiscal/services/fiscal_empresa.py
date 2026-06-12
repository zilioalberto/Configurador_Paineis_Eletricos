"""CNPJ da empresa configurado para operações do módulo fiscal."""
from __future__ import annotations

from django.conf import settings

from apps.fiscal.services.nfe_parser import NFeParserError
from apps.fiscal.utils import normalizar_cnpj


def cnpj_empresa_fiscal_configurado() -> str:
    """CNPJ da empresa (ZFW) configurado em FISCAL_EMPRESA_CNPJ."""
    cnpj = normalizar_cnpj(getattr(settings, "FISCAL_EMPRESA_CNPJ", "") or "")
    if len(cnpj) != 14:
        raise NFeParserError(
            "FISCAL_EMPRESA_CNPJ não configurado no servidor. "
            "Configure o CNPJ da ZFW antes de importar documentos fiscais."
        )
    return cnpj
