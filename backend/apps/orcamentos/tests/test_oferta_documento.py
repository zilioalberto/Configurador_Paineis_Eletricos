import pytest

from apps.orcamentos.services.oferta_documento import (
    montar_corpo_proposta_texto,
    secoes_textuais_preview,
)


def test_montar_corpo_proposta_texto_usa_titulos_markdown():
    secoes = [
        {"tipo": "INTRODUCAO", "titulo": "Apresentação", "conteudo": "Olá."},
        {"tipo": "ESCOPO", "titulo": "Escopo de fornecimento", "conteudo": "Painel QGBT."},
    ]
    texto = montar_corpo_proposta_texto(secoes)
    assert "## Apresentação" in texto
    assert "Painel QGBT." in texto


def test_secoes_textuais_preview_exclui_investimento():
    preview = {
        "secoes": [
            {"tipo": "ESCOPO", "titulo": "Escopo", "conteudo": "A"},
            {"tipo": "INVESTIMENTO", "titulo": "Investimento", "conteudo": "B"},
        ]
    }
    assert len(secoes_textuais_preview(preview)) == 1
