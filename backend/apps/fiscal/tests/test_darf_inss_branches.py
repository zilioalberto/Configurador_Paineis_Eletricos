"""Cobertura de ramos do serviço DARF INSS (separação do DAS Simples Nacional)."""
from decimal import Decimal

import pytest

from apps.fiscal.choices import (
    TipoAnexoObrigacaoFiscalChoices,
    TipoObrigacaoFiscalChoices,
)
from apps.fiscal.models_obrigacoes import (
    AnexoObrigacaoFiscal,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
)
from apps.fiscal.services.obrigacoes.darf_inss import (
    anexo_darf_inss,
    darf_importado_de_pdf,
    garantir_inss_darf_do_pdf,
    limpar_inss_darf_contaminado,
    sincronizar_obrigacao_darf,
    valor_darf_pdf,
    valor_parece_das_contaminado,
)

CNPJ = "07284171000139"


def _darf_parsed(valor="1118.26"):
    return {
        "tipo_obrigacao": TipoObrigacaoFiscalChoices.INSS_DARF,
        "tipo_anexo": "DARF",
        "valor": valor,
        "data_vencimento": "2026-04-20",
        "numero_documento": "1234",
        "descricao": "INSS — DARF",
        "linhas_composicao": [{"codigo": "1082", "descricao": "INSS", "valor": valor}],
        "sucesso": True,
    }


@pytest.fixture
def pacote(db):
    return PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ, competencia="2026-03")


def _anexo_darf(pacote, parsed=None):
    return AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.DARF,
        nome_original="DARF 03-2026.pdf",
        parsed_data=parsed or _darf_parsed(),
        parse_sucesso=True,
    )


@pytest.mark.django_db
def test_anexo_darf_inss_none_quando_sem_anexo(pacote):
    assert anexo_darf_inss(pacote) is None


@pytest.mark.django_db
def test_anexo_darf_inss_ignora_simples(pacote):
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.SIMPLES,
        nome_original="ZFW - SIMPLES NACIONAL 03-2026.pdf",
        parsed_data={"valor": "5000.00", "sucesso": True},
        parse_sucesso=True,
    )
    assert anexo_darf_inss(pacote) is None


@pytest.mark.django_db
def test_anexo_darf_inss_seleciona_darf(pacote):
    anexo = _anexo_darf(pacote)
    assert anexo_darf_inss(pacote) == anexo


@pytest.mark.django_db
def test_sincronizar_obrigacao_darf_cria_obrigacao_e_linha(pacote):
    obrig = sincronizar_obrigacao_darf(pacote, _darf_parsed())
    assert obrig is not None
    assert obrig.valor == Decimal("1118.26")
    assert obrig.dados_extra["fonte_valor"] == "pdf_darf"
    assert obrig.linhas_composicao.get(codigo="1082").valor == Decimal("1118.26")


@pytest.mark.django_db
def test_garantir_inss_darf_fluxo_completo(pacote):
    _anexo_darf(pacote)
    obrig = garantir_inss_darf_do_pdf(pacote)
    assert obrig is not None
    assert obrig.valor == Decimal("1118.26")
    assert darf_importado_de_pdf(pacote) is True
    valor, anexo = valor_darf_pdf(pacote)
    assert valor == Decimal("1118.26")
    assert anexo is not None


@pytest.mark.django_db
def test_garantir_sem_anexo_limpa(pacote):
    assert garantir_inss_darf_do_pdf(pacote) is None


@pytest.mark.django_db
def test_valor_parece_das_contaminado(pacote):
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.SIMPLES,
        nome_original="ZFW - SIMPLES NACIONAL 03-2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.DAS,
            "valor": "26610.30",
            "linhas_composicao": [{"codigo": "1006", "descricao": "INSS", "valor": "8000.00"}],
            "sucesso": True,
        },
        parse_sucesso=True,
    )
    contaminado = {"valor": "26610.30", "linhas_composicao": []}
    assert valor_parece_das_contaminado(pacote, contaminado) is True
    assert valor_parece_das_contaminado(pacote, {"valor": None}) is False


@pytest.mark.django_db
def test_limpar_inss_darf_contaminado_zera_valor_do_das(pacote):
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.SIMPLES,
        nome_original="ZFW - SIMPLES NACIONAL 03-2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.DAS,
            "valor": "26610.30",
            "linhas_composicao": [{"codigo": "1006", "descricao": "INSS", "valor": "8000.00"}],
            "sucesso": True,
        },
        parse_sucesso=True,
    )
    obrig = ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.INSS_DARF,
        valor=Decimal("26610.30"),
        dados_extra={},
    )
    resultado = limpar_inss_darf_contaminado(pacote)
    assert resultado is not None
    obrig.refresh_from_db()
    assert obrig.valor == Decimal("0")
    assert obrig.dados_extra.get("valor_das_removido") is True
