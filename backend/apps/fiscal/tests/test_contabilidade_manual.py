"""Testes de valor manual na coluna Contabilidade."""
from decimal import Decimal

import pytest

from apps.fiscal.choices import TipoObrigacaoFiscalChoices, TipoReconciliacaoFiscalChoices
from apps.fiscal.models_obrigacoes import ObrigacaoFiscal, PacoteObrigacaoFiscal
from apps.fiscal.services.obrigacoes.contabilidade_manual import aplicar_contabilidade_manual_e_reconciliar
from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_inss


@pytest.mark.django_db
def test_informar_inss_darf_manual_na_conciliacao():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    rec = aplicar_contabilidade_manual_e_reconciliar(
        pacote,
        TipoReconciliacaoFiscalChoices.INSS,
        valor=Decimal("1118.26"),
    )
    assert rec.valor_contabilidade == Decimal("1118.26")
    assert rec.detalhes.get("fonte_contabilidade") == "manual"
    darf = pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.INSS_DARF)
    assert darf.valor == Decimal("1118.26")
    assert darf.dados_extra.get("fonte_valor") == "manual"


@pytest.mark.django_db
def test_informar_fgts_manual_na_conciliacao():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    rec = aplicar_contabilidade_manual_e_reconciliar(
        pacote,
        TipoReconciliacaoFiscalChoices.FGTS,
        valor=Decimal("291.75"),
    )
    assert rec.valor_contabilidade == Decimal("291.75")
    fgts = pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.FGTS)
    assert fgts.valor == Decimal("291.75")


@pytest.mark.django_db
def test_reconciliar_inss_usa_valor_manual_persistido():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-05")
    aplicar_contabilidade_manual_e_reconciliar(
        pacote,
        TipoReconciliacaoFiscalChoices.INSS,
        valor=Decimal("1154.05"),
    )
    rec = reconciliar_inss(pacote)
    assert rec.valor_contabilidade == Decimal("1154.05")
