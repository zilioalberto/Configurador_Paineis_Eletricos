import pytest

from apps.orcamentos.services.formatacao_oferta import (
    capitalizar_texto_tecnico,
    formatar_conteudo_lista_oferta,
    formatar_descricao_item_oferta,
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
