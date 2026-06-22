"""Testes de conciliação fiscal (pacote mensal)."""
import pytest
from decimal import Decimal

from apps.fiscal.choices import (
    StatusReconciliacaoFiscalChoices,
    TipoObrigacaoFiscalChoices,
    TipoReconciliacaoFiscalChoices,
)
from apps.fiscal.models_obrigacoes import (
    AnexoObrigacaoFiscal,
    HoleriteCompetencia,
    LinhaComposicaoObrigacao,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
)
from apps.fiscal.services.obrigacoes.reconciliacao import (
    executar_reconciliacao_pacote,
    reconciliar_das_inss_holerites,
)
from apps.rh.models import Colaborador


def _anexo_simples_pdf(pacote, das, *, valor_total, valor_inss_1006):
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo="SIMPLES",
        nome_original="ZFW - SIMPLES NACIONAL.pdf",
        obrigacao=das,
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.DAS,
            "valor": str(valor_total),
            "sucesso": True,
            "linhas_composicao": [
                {"codigo": "1006", "descricao": "INSS - SIMPLES NACIONAL", "valor": str(valor_inss_1006)},
            ],
        },
        parse_sucesso=True,
    )


@pytest.mark.django_db
def test_reconciliar_das_inss_holerites_ok():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    das = ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        valor=Decimal("26610.30"),
    )
    LinhaComposicaoObrigacao.objects.create(
        obrigacao=das,
        codigo="1006",
        descricao="INSS - SIMPLES NACIONAL",
        valor=Decimal("1188.26"),
    )
    _anexo_simples_pdf(pacote, das, valor_total=Decimal("26610.30"), valor_inss_1006=Decimal("1188.26"))
    colaborador = Colaborador.objects.create(matricula="001", nome="ALICE ZILIO", ativo=True)
    HoleriteCompetencia.objects.create(
        pacote=pacote,
        colaborador=colaborador,
        nome="ALICE ZILIO",
        cpf="",
        desconto_inss=Decimal("178.31"),
        dados_extra={"valores_aplicados": True},
    )
    HoleriteCompetencia.objects.create(
        pacote=pacote,
        colaborador=colaborador,
        nome="ALBERTO ZILIO",
        cpf="",
        desconto_inss=Decimal("1009.95"),
        dados_extra={"valores_aplicados": True},
    )

    rec = reconciliar_das_inss_holerites(pacote)
    assert rec.tipo == TipoReconciliacaoFiscalChoices.DAS_INSS
    assert rec.status == StatusReconciliacaoFiscalChoices.OK
    assert rec.valor_interno == Decimal("1188.26")
    assert rec.valor_contabilidade == Decimal("1188.26")
    assert rec.diferenca == Decimal("0")
    assert rec.detalhes["codigo_das"] == "1006"
    assert rec.detalhes["holerites_validos"] == 2


@pytest.mark.django_db
def test_reconciliar_das_inss_holerites_pendente_sem_das():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    rec = reconciliar_das_inss_holerites(pacote)
    assert rec.status == StatusReconciliacaoFiscalChoices.PENDENTE
    assert rec.valor_contabilidade is None


@pytest.mark.django_db
def test_reconciliar_das_inss_holerites_erro_divergencia():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    das = ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        valor=Decimal("1000"),
    )
    LinhaComposicaoObrigacao.objects.create(
        obrigacao=das,
        codigo="1006",
        descricao="INSS - SIMPLES NACIONAL",
        valor=Decimal("8008.93"),
    )
    _anexo_simples_pdf(pacote, das, valor_total=Decimal("1000"), valor_inss_1006=Decimal("8008.93"))
    colaborador = Colaborador.objects.create(matricula="001", nome="TESTE", ativo=True)
    HoleriteCompetencia.objects.create(
        pacote=pacote,
        colaborador=colaborador,
        nome="TESTE",
        desconto_inss=Decimal("100.00"),
        dados_extra={"valores_aplicados": True},
    )

    rec = reconciliar_das_inss_holerites(pacote)
    assert rec.status == StatusReconciliacaoFiscalChoices.ERRO
    assert rec.valor_interno == Decimal("100.00")
    assert rec.valor_contabilidade == Decimal("8008.93")


@pytest.mark.django_db
def test_reconciliar_inss_darf_com_holerites_ok():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.INSS_DARF,
        valor=Decimal("1118.26"),
        descricao="INSS — DARF",
    )
    colaborador = Colaborador.objects.create(matricula="001", nome="ALICE ZILIO", ativo=True)
    HoleriteCompetencia.objects.create(
        pacote=pacote,
        colaborador=colaborador,
        nome="ALICE ZILIO",
        desconto_inss=Decimal("279.95"),
        dados_extra={"valores_aplicados": True},
    )
    HoleriteCompetencia.objects.create(
        pacote=pacote,
        colaborador=colaborador,
        nome="OUTRO",
        desconto_inss=Decimal("838.31"),
        dados_extra={"valores_aplicados": True},
    )

    from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_inss

    rec = reconciliar_inss(pacote)
    assert rec.status == StatusReconciliacaoFiscalChoices.OK
    assert rec.valor_interno == Decimal("1118.26")
    assert rec.valor_contabilidade == Decimal("1118.26")


@pytest.mark.django_db
def test_reconciliar_inss_pendente_sem_darf():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    colaborador = Colaborador.objects.create(matricula="001", nome="TESTE", ativo=True)
    HoleriteCompetencia.objects.create(
        pacote=pacote,
        colaborador=colaborador,
        nome="TESTE",
        desconto_inss=Decimal("100.00"),
        dados_extra={"valores_aplicados": True},
    )

    from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_inss

    rec = reconciliar_inss(pacote)
    assert rec.status == StatusReconciliacaoFiscalChoices.PENDENTE
    assert rec.valor_interno == Decimal("100.00")
    assert rec.valor_contabilidade is None


@pytest.mark.django_db
def test_executar_reconciliacao_inclui_das_inss():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    das = ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        valor=Decimal("100"),
    )
    LinhaComposicaoObrigacao.objects.create(
        obrigacao=das,
        codigo="1006",
        descricao="INSS",
        valor=Decimal("50"),
    )
    _anexo_simples_pdf(pacote, das, valor_total=Decimal("100"), valor_inss_1006=Decimal("50"))

    reconciliacoes = executar_reconciliacao_pacote(pacote)
    tipos = {r.tipo for r in reconciliacoes}
    assert TipoReconciliacaoFiscalChoices.DAS_INSS in tipos


@pytest.mark.django_db
def test_reconciliar_icms_pendente_sem_dime():
    from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_icms

    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    rec = reconciliar_icms(pacote)
    assert rec.status == StatusReconciliacaoFiscalChoices.PENDENTE
    assert rec.valor_contabilidade is None


@pytest.mark.django_db
def test_reconciliar_icms_pendente_dime_sem_valor_contabil():
    from apps.fiscal.models_obrigacoes import SnapshotApuracaoIcms
    from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_icms

    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    SnapshotApuracaoIcms.objects.create(
        pacote=pacote,
        imposto_a_recolher=Decimal("0"),
        saldo_credor=Decimal("1000"),
    )
    rec = reconciliar_icms(pacote)
    assert rec.status == StatusReconciliacaoFiscalChoices.PENDENTE
    assert rec.valor_contabilidade is None
    assert rec.detalhes.get("dime_importada") is True
