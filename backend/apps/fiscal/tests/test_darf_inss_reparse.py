"""Cobertura dos ramos de reparse e atualização de anexo do serviço DARF INSS."""
from decimal import Decimal

import pytest

from apps.fiscal.choices import (
    TipoAnexoObrigacaoFiscalChoices,
    TipoObrigacaoFiscalChoices,
)
from apps.fiscal.models_obrigacoes import AnexoObrigacaoFiscal, PacoteObrigacaoFiscal
from apps.fiscal.services.obrigacoes.darf_inss import (
    garantir_inss_darf_do_pdf,
    parsed_darf_do_pdf,
)
from apps.fiscal.tests.test_obrigacoes_parsers import DARF_TEXTO, SIMPLES_TEXTO

CNPJ = "07284171000139"


@pytest.fixture
def pacote(db):
    return PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ, competencia="2026-03")


@pytest.mark.django_db
def test_reparse_quando_sem_linhas_darf_e_atualiza_anexo(pacote):
    anexo = AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.OUTRO,
        nome_original="DARF 03.2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.INSS_DARF,
            "tipo_anexo": TipoAnexoObrigacaoFiscalChoices.DARF,
            "valor": "1118.26",
            "sucesso": True,
            "texto_preview": DARF_TEXTO + (" " * 200),
            "linhas_composicao": [],
        },
        parse_sucesso=False,
    )

    obrigacao = garantir_inss_darf_do_pdf(pacote)
    assert obrigacao is not None
    assert obrigacao.valor == Decimal("1118.26")

    anexo.refresh_from_db()
    assert anexo.tipo_arquivo == TipoAnexoObrigacaoFiscalChoices.DARF
    assert anexo.parse_sucesso is True
    assert anexo.obrigacao_id == obrigacao.id
    assert any(
        str(l.get("codigo")) == "1082" for l in (anexo.parsed_data.get("linhas_composicao") or [])
    )


@pytest.mark.django_db
def test_parsed_darf_reparse_retorna_none_quando_texto_e_simples(pacote):
    """Anexo marcado como DARF mas cujo texto é Simples Nacional não contamina o INSS."""
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.SIMPLES,
        nome_original="ZFW - SIMPLES NACIONAL 03-2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.DAS,
            "valor": "26610.30",
            "sucesso": True,
            "texto_preview": SIMPLES_TEXTO,
            "linhas_composicao": [
                {"codigo": "1006", "descricao": "INSS", "valor": "8008.93"},
            ],
        },
        parse_sucesso=True,
    )
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.DARF,
        nome_original="DARF suspeito 03.2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.INSS_DARF,
            "tipo_anexo": TipoAnexoObrigacaoFiscalChoices.DARF,
            "valor": "26610.30",
            "sucesso": True,
            "texto_preview": SIMPLES_TEXTO + (" " * 200),
            "linhas_composicao": [
                {"codigo": "1006", "descricao": "INSS SIMPLES", "valor": "8008.93"},
            ],
        },
        parse_sucesso=True,
    )

    assert parsed_darf_do_pdf(pacote) is None
