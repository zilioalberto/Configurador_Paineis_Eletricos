"""Cobertura adicional dos parsers FGTS, ISS e DARF."""
from decimal import Decimal

from apps.fiscal.choices import TipoObrigacaoFiscalChoices
from apps.fiscal.services.obrigacoes.parsers.darf import parse_darf
from apps.fiscal.services.obrigacoes.parsers.fgts import parse_fgts
from apps.fiscal.services.obrigacoes.parsers.iss import parse_iss
from apps.fiscal.tests.test_obrigacoes_parsers import DARF_TEXTO, FGTS_TEXTO, ISS_TEXTO


def test_parse_fgts_extrai_valor_competencia_e_trabalhadores():
    r = parse_fgts(FGTS_TEXTO)
    assert r["tipo_obrigacao"] == TipoObrigacaoFiscalChoices.FGTS
    assert r["competencia"] == "2026-03"
    assert Decimal(r["valor"]) == Decimal("291.75")
    assert r["data_vencimento"] == "2026-04-20"
    assert r["dados_extra"]["quantidade_trabalhadores"] is not None
    assert r["sucesso"] is True


def test_parse_fgts_sem_dados_reporta_erros():
    r = parse_fgts("documento irrelevante sem valores")
    assert r["sucesso"] is False
    assert r["erros"]
    assert r["dados_extra"]["quantidade_trabalhadores"] is None


def test_parse_iss_extrai_valor_e_dados():
    r = parse_iss(ISS_TEXTO)
    assert r["tipo_obrigacao"] == TipoObrigacaoFiscalChoices.ISS
    assert r["competencia"] == "2026-03"
    assert Decimal(r["valor"]) == Decimal("23.27")
    assert r["data_vencimento"] == "2026-04-15"
    assert r["dados_extra"]["numero_nfse"] == "1088"
    assert r["sucesso"] is True


def test_parse_iss_sem_valor_reporta_erro():
    r = parse_iss("Competência 03/2026. sem imposto")
    assert r["sucesso"] is False
    assert any("ISS" in erro for erro in r["erros"])


def test_parse_darf_extrai_total_e_linhas_inss():
    r = parse_darf(DARF_TEXTO)
    assert r["tipo_obrigacao"] == TipoObrigacaoFiscalChoices.INSS_DARF
    assert Decimal(r["valor"]) == Decimal("1118.26")
    assert r["data_vencimento"] == "2026-04-20"
    codigos = {linha["codigo"] for linha in r["linhas_composicao"]}
    assert {"1082", "1099"}.issubset(codigos)
    assert r["sucesso"] is True


def test_parse_darf_sem_valor_reporta_erro():
    r = parse_darf("texto sem valores fiscais")
    assert r["sucesso"] is False
    assert r["erros"]
