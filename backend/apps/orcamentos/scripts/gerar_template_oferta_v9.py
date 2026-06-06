#!/usr/bin/env python
"""
Gera zfw_proposta_template_v9.docx (corpo único) — DESCONTINUADO para produção.

O export DOCX usa v8 (campos por seção). Mantido só para referência/experimentos.

Uso (na pasta backend):
  python -m apps.orcamentos.scripts.gerar_template_oferta_v9
"""
from __future__ import annotations

import re
import shutil
import sys
from pathlib import Path
from xml.etree import ElementTree as ET
from zipfile import ZIP_DEFLATED, ZipFile

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
W = f"{{{W_NS}}}"


def _texto_paragrafo(para: ET.Element) -> str:
    return "".join(t.text or "" for t in para.iter(f"{W}t")).strip()


def _substituir_texto_em_paragrafo(para: ET.Element, antigo: str, novo: str) -> bool:
    texto = _texto_paragrafo(para)
    if antigo not in texto:
        return False
    for t in para.iter(f"{W}t"):
        if t.text and antigo in t.text:
            t.text = t.text.replace(antigo, novo)
            return True
    return False


def _criar_paragrafo_placeholder(texto: str) -> ET.Element:
    p = ET.Element(f"{W}p")
    r = ET.SubElement(p, f"{W}r")
    t = ET.SubElement(r, f"{W}t")
    t.text = texto
    return p


def transformar_documento_xml(xml: str) -> str:
    ET.register_namespace("w", W_NS)
    ET.register_namespace("w14", "http://schemas.microsoft.com/office/word/2010/wordml")
    ET.register_namespace("mc", "http://schemas.openxmlformats.org/markup-compatibility/2006")
    root = ET.fromstring(xml.encode("utf-8") if isinstance(xml, str) else xml)
    body = root.find(f"{W}body")
    if body is None:
        return xml

    paragrafos = list(body.findall(f"{W}p"))
    indices_remover: set[int] = set()

    for i, para in enumerate(paragrafos):
        texto = _texto_paragrafo(para)
        if "{{r escopo_fornecimento }}" in texto or "{{r escopo_fornecimento}}" in texto:
            _substituir_texto_em_paragrafo(para, "{{r escopo_fornecimento }}", "{{r corpo_proposta }}")
            _substituir_texto_em_paragrafo(para, "{{r escopo_fornecimento}}", "{{r corpo_proposta }}")
        if "{{ servicos_considerados }}" in texto:
            indices_remover.add(i)

    marcadores_fim = (
        "Caso a empresa compradora",
        "Posto",
        "Os preços mencionados",
    )

    dentro_bloco_removivel = False
    for i, para in enumerate(paragrafos):
        texto = _texto_paragrafo(para)
        if texto == "Exclusões" or texto.startswith("Exclus"):
            dentro_bloco_removivel = True
        if dentro_bloco_removivel:
            if any(texto.startswith(m) for m in marcadores_fim):
                dentro_bloco_removivel = False
            else:
                if (
                    "{{ exclusoes }}" in texto
                    or "{{ observacoes }}" in texto
                    or "{{ prazo_entrega }}" in texto
                    or "{{ condicoes_pagamento }}" in texto
                    or texto in ("Exclusões", "Observações", "Prazo de entrega:", "Condições de Pagamento:")
                    or "{{ garantia_texto }}" in texto
                    or texto == "Exclusões"
                ):
                    indices_remover.add(i)
                elif texto.startswith("Exclus") or texto.startswith("Observ"):
                    indices_remover.add(i)

    # Remove "Sistema elétrico" e título fixo duplicado antes do corpo
    for i, para in enumerate(paragrafos):
        texto = _texto_paragrafo(para)
        if texto in ("Sistema elétrico", "Sistema elétrico "):
            indices_remover.add(i)

    for i in sorted(indices_remover, reverse=True):
        body.remove(paragrafos[i])

    # Insere rótulo do corpo antes do placeholder (se ainda não existir)
    paragrafos = list(body.findall(f"{W}p"))
    paragrafos = list(body.findall(f"{W}p"))
    for idx, para in enumerate(paragrafos):
        if "{{r corpo_proposta }}" in _texto_paragrafo(para):
            pos = list(body).index(para)
            body.insert(pos, _criar_paragrafo_placeholder("Conteúdo da proposta"))
            break

    out = ET.tostring(root, encoding="unicode")
    if not out.startswith("<?xml"):
        out = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' + out
    return out


def gerar_v9(origem: Path, destino: Path) -> None:
    if destino.exists():
        destino.unlink()
    shutil.copy2(origem, destino)

    with ZipFile(destino, "r") as zin:
        document_xml = zin.read("word/document.xml").decode("utf-8")

    novo_xml = transformar_documento_xml(document_xml)
    # Garantir declaração XML
    if not novo_xml.startswith("<?xml"):
        novo_xml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n' + novo_xml

    buffer_path = destino.with_suffix(".tmp.zip")
    with ZipFile(origem, "r") as zin, ZipFile(buffer_path, "w", compression=ZIP_DEFLATED) as zout:
        for item in zin.infolist():
            data = zin.read(item.filename)
            if item.filename == "word/document.xml":
                data = novo_xml.encode("utf-8")
            zout.writestr(item, data)

    buffer_path.replace(destino)
    print(f"Template gerado: {destino}")


def main() -> int:
    base = Path(__file__).resolve().parent.parent / "templates" / "ofertas"
    origem = base / "zfw_proposta_template_v8.docx"
    destino = base / "zfw_proposta_template_v9.docx"
    if not origem.exists():
        print(f"Arquivo não encontrado: {origem}", file=sys.stderr)
        return 1
    gerar_v9(origem, destino)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
