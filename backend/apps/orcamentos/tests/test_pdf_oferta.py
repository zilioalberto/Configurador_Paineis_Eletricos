"""Testes auxiliares de geração de PDF da oferta."""
from apps.orcamentos.services.pdf_oferta import _fmt_brl, nome_arquivo_pdf_oferta


def test_nome_arquivo_pdf_oferta_sanitiza_codigo():
    assert nome_arquivo_pdf_oferta({"codigo": "Prop/05001-26 Rev A"}) == "Prop_05001-26_Rev_A_oferta.pdf"


def test_nome_arquivo_pdf_oferta_fallback():
    assert nome_arquivo_pdf_oferta({}) == "proposta_oferta.pdf"


def test_fmt_brl():
    assert _fmt_brl("1234.5") == "R$ 1.234,50"
    assert _fmt_brl("invalido") == "invalido"
