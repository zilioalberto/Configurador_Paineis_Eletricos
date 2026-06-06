"""Montagem do corpo único da oferta (portal → DOCX / prévia)."""
from __future__ import annotations

from apps.orcamentos.services.oferta_secoes import TIPOS_BLOCO_EXCLUIDOS_TEXTO
from apps.orcamentos.services.oferta_texto import texto_rich_paragrafos_docxtpl


def montar_corpo_proposta_texto(secoes: list[dict]) -> str:
    """
    Texto contínuo com títulos ``##`` (mesmo contrato do editor no portal).
    """
    partes: list[str] = []
    for secao in secoes:
        conteudo = str(secao.get("conteudo") or "").strip()
        if not conteudo:
            continue
        titulo = str(secao.get("titulo") or "").strip() or str(secao.get("tipo") or "Seção")
        partes.append(f"## {titulo}\n\n{conteudo}")
    return "\n\n".join(partes) if partes else "-"


def montar_corpo_proposta_rich(secoes: list[dict]):
    """
    RichText docxtpl: título de seção em negrito, parágrafos com ``\\a``.
    """
    try:
        from docxtpl import RichText
    except ImportError:  # pragma: no cover
        return texto_rich_paragrafos_docxtpl(montar_corpo_proposta_texto(secoes))

    filtradas = [
        s
        for s in secoes
        if s.get("tipo") not in TIPOS_BLOCO_EXCLUIDOS_TEXTO
        and str(s.get("conteudo") or "").strip()
    ]
    if not filtradas:
        rt = RichText()
        rt.add("-", font="Arial", size=24)
        return rt

    rt = RichText()
    for index, secao in enumerate(filtradas):
        titulo = str(secao.get("titulo") or "").strip() or str(secao.get("tipo") or "Seção")
        conteudo = str(secao.get("conteudo") or "").strip()
        if index:
            rt.add("\a")
        rt.add(titulo, bold=True, font="Arial", size=26)
        rt.add("\a")
        rt.add(
            texto_rich_paragrafos_docxtpl(conteudo),
            font="Arial",
            size=24,
        )
    return rt


def secoes_textuais_preview(preview: dict) -> list[dict]:
    return [
        s
        for s in preview.get("secoes") or []
        if s.get("tipo") not in TIPOS_BLOCO_EXCLUIDOS_TEXTO
    ]
