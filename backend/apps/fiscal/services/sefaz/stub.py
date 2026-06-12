"""Provedor stub para testes e homologação sem certificado."""
from __future__ import annotations

from .parse_dist_dfe import DistDfeResultado


def consultar_distribuicao_stub(*, ultimo_nsu: str) -> DistDfeResultado:
    return DistDfeResultado(
        cstat="137",
        xmotivo="Nenhum documento localizado (stub)",
        ultimo_nsu=ultimo_nsu,
        max_nsu=ultimo_nsu,
        documentos=[],
        resposta_bruta="stub",
    )
