"""Contrato do provedor SEFAZ local."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Protocol


@dataclass
class DistDfeDocumento:
    """XML bruto obtido na consulta (não interpretar negócio na ponte)."""

    xml: str
    nsu: str | None = None
    nome_arquivo: str | None = None


@dataclass
class DistDfeResultado:
    cstat: str
    xmotivo: str
    ultimo_nsu: str
    max_nsu: str
    documentos: list[DistDfeDocumento] = field(default_factory=list)
    resposta_bruta: str = ""


class SefazProvider(Protocol):
    def distribuicao_por_ult_nsu(
        self,
        *,
        cnpj: str,
        uf: str,
        ultimo_nsu: str,
    ) -> DistDfeResultado: ...
