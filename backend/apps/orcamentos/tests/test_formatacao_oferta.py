import pytest

from apps.orcamentos.services.formatacao_oferta import (
    capitalizar_texto_tecnico,
    extrair_texto_item_lista,
    formatar_conteudo_lista_oferta,
    formatar_descricao_item_oferta,
    numero_proposta_exibicao,
)


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        (
            "CONTADOR AC3:9A 1NA 24VCC",
            "Contador AC3:9A 1NA 24VCC",
        ),
        (
            "MÃO DE OBRA DE PROGRAMADOR",
            "Mão de obra de programador",
        ),
        (
            "Contador AC3:9A 1NA 24VCC",
            "Contador AC3:9A 1NA 24VCC",
        ),
    ],
)
def test_formatar_descricao_item_oferta(entrada, esperado):
    assert formatar_descricao_item_oferta(entrada) == esperado


def test_formatar_conteudo_lista_oferta():
    conteudo = (
        "- CONTADOR AC3:9A 1NA 24VCC;\n"
        "- MÃO DE OBRA DE PROGRAMADOR;"
    )
    formatado = formatar_conteudo_lista_oferta(conteudo)
    assert "Contador AC3:9A 1NA 24VCC" in formatado
    assert "Mão de obra de programador" in formatado
    assert "CONTADOR" not in formatado


def test_capitalizar_texto_tecnico_multilinha():
    texto = "FORNECIMENTO DE CLP SIEMENS\nPARA AUTOMAÇÃO"
    assert capitalizar_texto_tecnico(texto) == "Fornecimento de CLP SIEMENS\nPara automação"


def test_numero_proposta_exibicao_remove_sufixo_rev():
    assert numero_proposta_exibicao("Prop-06001-26 Rev C", revisao="C") == "Prop-06001-26"
    assert (
        numero_proposta_exibicao("Prop-06001-26 Rev C", revisao="C", codigo_base="Prop-06001-26")
        == "Prop-06001-26"
    )
    assert numero_proposta_exibicao("Prop-06001-26", revisao="C") == "Prop-06001-26"
    assert numero_proposta_exibicao("", revisao="A") == "-"


def test_extrair_texto_item_lista():
    assert extrair_texto_item_lista("- Item A") == "Item A"
    assert extrair_texto_item_lista("  • Item B") == "Item B"
    assert extrair_texto_item_lista("Parágrafo") is None
    assert extrair_texto_item_lista("-sem espaco") is None
