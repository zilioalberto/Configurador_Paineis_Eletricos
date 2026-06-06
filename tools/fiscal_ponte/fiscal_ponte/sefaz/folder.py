"""Lê XMLs de uma pasta local e simula retorno DistDFe (homologação)."""
from __future__ import annotations

from pathlib import Path

from .acbr_response import normalizar_nsu
from .base import DistDfeDocumento, DistDfeResultado, SefazProvider


class FolderXmlProvider:
    """Envia todos os .xml da pasta uma vez; depois retorna vazio (cStat 137)."""

    def __init__(self, folder: Path) -> None:
        self._folder = folder
        self._enviados = False

    def distribuicao_por_ult_nsu(
        self,
        *,
        cnpj: str,
        uf: str,
        ultimo_nsu: str,
    ) -> DistDfeResultado:
        nsu = normalizar_nsu(ultimo_nsu)
        if self._enviados or not self._folder.is_dir():
            return DistDfeResultado(
                cstat="137",
                xmotivo="Nenhum documento na pasta (já processado ou pasta vazia)",
                ultimo_nsu=nsu,
                max_nsu=nsu,
            )

        docs: list[DistDfeDocumento] = []
        for path in sorted(self._folder.glob("*.xml")):
            xml = path.read_text(encoding="utf-8", errors="replace").strip()
            if xml:
                docs.append(DistDfeDocumento(xml=xml, nome_arquivo=path.name))
        self._enviados = True
        if not docs:
            return DistDfeResultado(
                cstat="137",
                xmotivo="Pasta sem XML",
                ultimo_nsu=nsu,
                max_nsu=nsu,
            )

        return DistDfeResultado(
            cstat="138",
            xmotivo=f"{len(docs)} documento(s) na pasta",
            ultimo_nsu=nsu,
            max_nsu=nsu,
            documentos=docs,
            resposta_bruta=f"folder:{self._folder}",
        )
