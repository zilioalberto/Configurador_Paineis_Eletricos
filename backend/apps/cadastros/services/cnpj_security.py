"""
Parametros de seguranca do fluxo CNPJ (settings / env).
"""
from __future__ import annotations

from django.conf import settings


def cnpj_consulta_config() -> dict:
    return getattr(settings, "CNPJ_CONSULTA", {})


def max_socios_cnpj() -> int:
    return int(cnpj_consulta_config().get("MAX_SOCIOS", 50))


def max_cnaes_cnpj() -> int:
    return int(cnpj_consulta_config().get("MAX_CNAES", 50))


def max_response_bytes_cnpj() -> int:
    return int(cnpj_consulta_config().get("MAX_RESPONSE_BYTES", 524288))


def timeout_cnpj_sec() -> int:
    return int(cnpj_consulta_config().get("TIMEOUT_SEC", 15))


def brasilapi_cnpj_url() -> str:
    return cnpj_consulta_config().get(
        "BRASILAPI_URL",
        "https://brasilapi.com.br/api/cnpj/v1/{cnpj}",
    )
