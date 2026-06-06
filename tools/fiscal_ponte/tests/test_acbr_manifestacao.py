from fiscal_ponte.sefaz.acbr_manifestacao import (
    montar_ini_evento_manifestacao,
    parse_resposta_manifestacao,
)


def test_montar_ini_confirmacao():
    ini = montar_ini_evento_manifestacao(
        chave_acesso="35200123456789012345678901234567890123456123",
        cnpj="98765432000188",
        tipo="CONFIRMACAO",
    )
    assert "tpEvento=210200" in ini
    assert "CNPJ=98765432000188" in ini
    assert "cOrgao=35" in ini


def test_parse_sucesso():
    texto = "OK:\nCStat=135\nXMotivo=Evento registrado\nnProt=123456"
    r = parse_resposta_manifestacao(texto)
    assert r.sucesso is True
    assert r.cstat == "135"
