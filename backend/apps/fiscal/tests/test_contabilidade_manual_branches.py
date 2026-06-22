"""Cobertura de ramos do serviço de contabilidade manual da conciliação fiscal."""
from decimal import Decimal

import pytest

from apps.fiscal.choices import (
    TipoObrigacaoFiscalChoices,
    TipoReconciliacaoFiscalChoices,
)
from apps.fiscal.models_obrigacoes import (
    AnexoObrigacaoFiscal,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
)
from apps.fiscal.services.obrigacoes.contabilidade_manual import (
    aplicar_contabilidade_manual_e_reconciliar,
    atualizar_contabilidade_manual,
    valor_contabil_manual,
    valor_icms_manual,
)

CNPJ_ZFW = "07284171000139"


@pytest.fixture
def pacote(db):
    return PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-03")


@pytest.mark.django_db
def test_inss_manual_cria_obrigacao_e_reconciliacao(pacote):
    rec = aplicar_contabilidade_manual_e_reconciliar(
        pacote, TipoReconciliacaoFiscalChoices.INSS, valor=Decimal("800.00")
    )
    assert rec.valor_contabilidade == Decimal("800.00")
    obrig = pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.INSS_DARF)
    assert obrig.valor == Decimal("800.00")
    assert valor_contabil_manual(pacote, TipoReconciliacaoFiscalChoices.INSS) == Decimal("800.00")


@pytest.mark.django_db
def test_iss_manual_cria_obrigacao(pacote):
    aplicar_contabilidade_manual_e_reconciliar(
        pacote, TipoReconciliacaoFiscalChoices.ISS, valor=Decimal("310.50")
    )
    assert pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.ISS).valor == Decimal("310.50")


@pytest.mark.django_db
def test_icms_manual_entradas_saidas_e_limpar(pacote):
    aplicar_contabilidade_manual_e_reconciliar(
        pacote,
        TipoReconciliacaoFiscalChoices.ICMS,
        icms_entradas=Decimal("1000.00"),
        icms_saidas=Decimal("1500.00"),
    )
    assert valor_icms_manual(pacote, "entradas") == Decimal("1000.00")
    assert valor_icms_manual(pacote, "saidas") == Decimal("1500.00")

    atualizar_contabilidade_manual(pacote, TipoReconciliacaoFiscalChoices.ICMS, limpar=True)
    assert valor_icms_manual(pacote, "entradas") is None


@pytest.mark.django_db
def test_icms_sem_valores_levanta_erro(pacote):
    with pytest.raises(ValueError):
        atualizar_contabilidade_manual(pacote, TipoReconciliacaoFiscalChoices.ICMS)


@pytest.mark.django_db
def test_das_inss_manual_aplica_linha_1006(pacote):
    aplicar_contabilidade_manual_e_reconciliar(
        pacote, TipoReconciliacaoFiscalChoices.DAS_INSS, valor=Decimal("420.00")
    )
    das = pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.DAS)
    assert das.linhas_composicao.filter(codigo="1006").first().valor == Decimal("420.00")


@pytest.mark.django_db
def test_das_inss_valor_zero_levanta_erro(pacote):
    with pytest.raises(ValueError):
        atualizar_contabilidade_manual(
            pacote, TipoReconciliacaoFiscalChoices.DAS_INSS, valor=Decimal("0")
        )


@pytest.mark.django_db
def test_limpar_remove_valor_manual(pacote):
    atualizar_contabilidade_manual(
        pacote, TipoReconciliacaoFiscalChoices.FGTS, valor=Decimal("250.00")
    )
    assert valor_contabil_manual(pacote, TipoReconciliacaoFiscalChoices.FGTS) == Decimal("250.00")
    atualizar_contabilidade_manual(pacote, TipoReconciliacaoFiscalChoices.FGTS, limpar=True)
    assert valor_contabil_manual(pacote, TipoReconciliacaoFiscalChoices.FGTS) is None


@pytest.mark.django_db
def test_tipo_nao_editavel_levanta_erro(pacote):
    with pytest.raises(ValueError):
        atualizar_contabilidade_manual(pacote, "TIPO_INEXISTENTE", valor=Decimal("10.00"))


@pytest.mark.django_db
def test_contabilidade_bloqueada_por_pdf(pacote):
    das = ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        valor=Decimal("26610.30"),
        dados_extra={"fonte_valor": "pdf_simples_nacional"},
    )
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo="SIMPLES",
        nome_original="ZFW - SIMPLES NACIONAL 03-2026.pdf",
        parsed_data={"valor": "26610.30", "tipo_obrigacao": "DAS", "sucesso": True},
        parse_sucesso=True,
        obrigacao=das,
    )
    with pytest.raises(ValueError):
        atualizar_contabilidade_manual(
            pacote, TipoReconciliacaoFiscalChoices.DAS, valor=Decimal("999.00")
        )
