"""Parser de XML NFS-e recebida (tomador = empresa)."""
from __future__ import annotations

import re
from typing import Any

from apps.fiscal.services.documento_emitido_parser import (
    DocumentoEmitidoParserError,
    parse_nfse_servico_emitida,
)
from apps.fiscal.utils import normalizar_cnpj


class NfseRecebidaParserError(ValueError):
    """Erro ao interpretar XML de NFS-e recebida."""


def _extrair_codigo_verificacao(xml: str) -> str:
    match = re.search(
        r"<(?:[\w:]+:)?CodigoVerificacao>([^<]+)</(?:[\w:]+:)?CodigoVerificacao>",
        xml,
        re.IGNORECASE,
    )
    return (match.group(1).strip() if match else "")[:60]


def parse_nfse_recebida(xml: str) -> dict[str, Any]:
    try:
        dados = parse_nfse_servico_emitida(xml)
    except DocumentoEmitidoParserError as exc:
        raise NfseRecebidaParserError(str(exc)) from exc

    codigo = _extrair_codigo_verificacao(xml)
    prestador = dados.get("emitente") or {}
    tomador = dados.get("destinatario") or {}
    itens = dados.get("itens") or []
    descricao = itens[0]["descricao"] if itens else dados.get("natureza_operacao") or ""
    chave = (dados.get("chave_acesso") or "").strip()
    numero = dados["numero"]

    if chave:
        identificador = f"NFSE-NAC:{chave}"
    else:
        identificador = f"NFSE:{prestador.get('cnpj', '')}:{numero}:{codigo or 'SEM-CODIGO'}"

    return {
        "identificador": identificador,
        "chave_acesso": chave,
        "numero": numero,
        "codigo_verificacao": codigo,
        "data_emissao": dados.get("data_emissao"),
        "valor_total": dados["valor_total"],
        "cnpj_prestador": prestador.get("cnpj", ""),
        "nome_prestador": prestador.get("nome", ""),
        "cnpj_tomador": tomador.get("cnpj", ""),
        "nome_tomador": tomador.get("nome", ""),
        "descricao_servico": descricao,
        "itens": [{"numero_item": 1, "descricao": descricao, "valor_total": dados["valor_total"]}],
    }


def validar_tomador_nfse_recebida(tomador: dict[str, str], *, cnpj_empresa: str) -> None:
    cnpj_tomador = normalizar_cnpj(tomador.get("cnpj") or "")
    if len(cnpj_empresa) == 14 and cnpj_tomador and cnpj_tomador != cnpj_empresa:
        raise NfseRecebidaParserError(
            f"Esta NFS-e não é destinada à empresa configurada (CNPJ {cnpj_empresa}). "
            "Importe apenas NFS-es em que a ZFW figure como tomadora."
        )
