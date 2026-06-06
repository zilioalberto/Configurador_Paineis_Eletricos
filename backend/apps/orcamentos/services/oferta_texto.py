"""
Regras de parágrafo/lista para oferta comercial (portal, DOCX e prévia).

Contrato:
- Linha em branco separa parágrafos.
- Quebra de linha simples dentro de um parágrafo vira quebra visual (\\n no mesmo parágrafo).
- Linhas iniciadas com ``- `` formam bloco de lista (itens sem ponto e vírgula forçado).
"""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


@dataclass(frozen=True)
class BlocoTextoOferta:
    kind: Literal["paragraph", "list"]
    lines: tuple[str, ...]

    @property
    def texto_paragrafo(self) -> str:
        return "\n".join(self.lines)


def _limpar_linha(linha: str) -> str:
    return linha.strip()


def segmentar_conteudo_oferta(valor: str) -> list[BlocoTextoOferta]:
    """
    Segmenta conteúdo editado em parágrafos e listas.
    """
    texto = str(valor or "").replace("\r\n", "\n").replace("\r", "\n")
    if not texto.strip():
        return [BlocoTextoOferta(kind="paragraph", lines=("-",))]

    blocos: list[BlocoTextoOferta] = []
    paragrafo_atual: list[str] = []
    lista_atual: list[str] = []

    def flush_paragrafo() -> None:
        nonlocal paragrafo_atual
        if paragrafo_atual:
            blocos.append(
                BlocoTextoOferta(kind="paragraph", lines=tuple(paragrafo_atual))
            )
            paragrafo_atual = []

    def flush_lista() -> None:
        nonlocal lista_atual
        if lista_atual:
            blocos.append(BlocoTextoOferta(kind="list", lines=tuple(lista_atual)))
            lista_atual = []

    for linha in texto.split("\n"):
        limpa = _limpar_linha(linha)
        if not limpa:
            flush_lista()
            flush_paragrafo()
            continue

        if limpa.startswith("- "):
            flush_paragrafo()
            lista_atual.append(limpa[2:].strip())
            continue

        flush_lista()
        paragrafo_atual.append(limpa)

    flush_lista()
    flush_paragrafo()
    return blocos or [BlocoTextoOferta(kind="paragraph", lines=("-",))]


def paragrafos_planos(valor: str) -> list[str]:
    """Lista de parágrafos/itens para renderização (cada item de lista vira linha com marcador)."""
    resultado: list[str] = []
    for bloco in segmentar_conteudo_oferta(valor):
        if bloco.kind == "list":
            resultado.extend(f"- {item}" for item in bloco.lines if item)
        else:
            texto = bloco.texto_paragrafo.strip()
            if texto and texto != "-":
                resultado.append(texto)
    return resultado or ["-"]


def texto_para_listing_docxtpl(valor: str) -> str:
    """Texto com um item por linha (sem ``;`` artificial) para ``docxtpl.Listing``."""
    linhas: list[str] = []
    for bloco in segmentar_conteudo_oferta(valor):
        if bloco.kind == "list":
            linhas.extend(item for item in bloco.lines if item)
        else:
            texto = bloco.texto_paragrafo.strip()
            if texto and texto != "-":
                linhas.append(texto)
    return "\n".join(linhas) if linhas else "-"


def texto_rich_paragrafos_docxtpl(valor: str) -> str:
    """Separa parágrafos com ``\\a`` (RichText docxtpl)."""
    partes = paragrafos_planos(valor)
    return "\a".join(partes)


def texto_junto_paragrafos(valor: str) -> str:
    """Parágrafos separados por linha em branco (prévia legível)."""
    partes: list[str] = []
    for bloco in segmentar_conteudo_oferta(valor):
        if bloco.kind == "list":
            partes.append("\n".join(f"- {item}" for item in bloco.lines if item))
        else:
            texto = bloco.texto_paragrafo.strip()
            if texto and texto != "-":
                partes.append(texto)
    return "\n\n".join(partes) if partes else "-"
