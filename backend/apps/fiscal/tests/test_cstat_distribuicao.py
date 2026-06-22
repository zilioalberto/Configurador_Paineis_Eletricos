import pytest

from apps.fiscal.services.sefaz.cstat_distribuicao import (
    avaliar_resposta_distribuicao,
    classificar_cstat_distribuicao,
    formatar_alerta_sefaz,
)


@pytest.mark.parametrize(
    ("cstat", "tipo"),
    [
        ("137", "sucesso"),
        ("138", "sucesso"),
        ("656", "bloqueio"),
        ("280", "erro"),
        ("", "desconhecido"),
    ],
)
def test_classificar_cstat_distribuicao(cstat, tipo):
    assert classificar_cstat_distribuicao(cstat) == tipo


def test_avaliar_resposta_sucesso_sem_alerta():
    avaliacao = avaliar_resposta_distribuicao("137", "Nenhum documento localizado")
    assert avaliacao.grave is False
    assert avaliacao.alerta == ""


def test_avaliar_resposta_bloqueio():
    avaliacao = avaliar_resposta_distribuicao("656", "Consumo Indevido")
    assert avaliacao.grave is True
    assert "656" in avaliacao.alerta


def test_avaliar_resposta_erro_certificado():
    avaliacao = avaliar_resposta_distribuicao("280", "Certificado inválido")
    assert avaliacao.grave is True
    assert "280" in avaliacao.alerta


def test_formatar_alerta_sefaz():
    assert formatar_alerta_sefaz(cstat="593", xmotivo="CNPJ difere") == "SEFAZ cStat 593: CNPJ difere"
