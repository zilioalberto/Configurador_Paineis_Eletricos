"""Stub ADN para testes sem certificado."""
from __future__ import annotations

from .parse_dfe import AdnDfeResultado


def consultar_distribuicao_stub(*, ultimo_nsu: str) -> AdnDfeResultado:
    return AdnDfeResultado(
        status_processamento="NenhumDocumentoLocalizado",
        ultimo_nsu=ultimo_nsu,
        max_nsu=ultimo_nsu,
        motivo="Nenhum documento localizado (stub ADN)",
        documentos=[],
    )
