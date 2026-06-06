"""Provedor sem SEFAZ — útil para validar API e CI."""
from __future__ import annotations

from .acbr_response import normalizar_nsu
from .base import DistDfeResultado, SefazProvider


class StubSefazProvider:
    """Simula SEFAZ sem documentos (cStat 137)."""

    def distribuicao_por_ult_nsu(
        self,
        *,
        cnpj: str,
        uf: str,
        ultimo_nsu: str,
    ) -> DistDfeResultado:
        nsu = normalizar_nsu(ultimo_nsu)
        return DistDfeResultado(
            cstat="137",
            xmotivo="Nenhum documento localizado (stub)",
            ultimo_nsu=nsu,
            max_nsu=nsu,
            documentos=[],
            resposta_bruta="STUB cStat=137",
        )
