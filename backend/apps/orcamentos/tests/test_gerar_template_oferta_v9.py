"""Testes unitários do script de template v9 (funções puras)."""
from apps.orcamentos.constants import OOXML_W_NS
from apps.orcamentos.scripts.gerar_template_oferta_v9 import (
    _criar_paragrafo_placeholder,
    _substituir_texto_em_paragrafo,
    _texto_paragrafo,
    transformar_documento_xml,
)
from xml.etree import ElementTree as ET

W = f"{{{OOXML_W_NS}}}"


def test_texto_paragrafo_concatena_runs():
    p = ET.Element(f"{W}p")
    r = ET.SubElement(p, f"{W}r")
    t = ET.SubElement(r, f"{W}t")
    t.text = "Olá "
    r2 = ET.SubElement(p, f"{W}r")
    t2 = ET.SubElement(r2, f"{W}t")
    t2.text = "mundo"

    assert _texto_paragrafo(p) == "Olá mundo"


def test_substituir_texto_em_paragrafo():
    p = _criar_paragrafo_placeholder("{{ titulo }}")
    assert _substituir_texto_em_paragrafo(p, "{{ titulo }}", "Proposta") is True
    assert _texto_paragrafo(p) == "Proposta"


def test_transformar_documento_xml_insere_placeholder_corpo():
    xml = f"""<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="{OOXML_W_NS}">
  <w:body>
    <w:p><w:r><w:t>Exclusões</w:t></w:r></w:p>
    <w:p><w:r><w:t>{{ corpo_oferta }}</w:t></w:r></w:p>
  </w:body>
</w:document>"""
    out = transformar_documento_xml(xml)
    assert "corpo_oferta" in out
    assert "Exclus" not in out
