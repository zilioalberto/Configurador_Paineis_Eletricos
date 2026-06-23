"""Testes de valor DAS a partir do PDF Simples Nacional."""
from decimal import Decimal

import pytest

from apps.fiscal.choices import TipoAnexoObrigacaoFiscalChoices, TipoObrigacaoFiscalChoices
from apps.fiscal.models_obrigacoes import AnexoObrigacaoFiscal, ObrigacaoFiscal, PacoteObrigacaoFiscal
from apps.fiscal.services.obrigacoes.das_simples import (
    reparar_das_de_anexo_simples,
    sincronizar_obrigacao_das,
    valor_das_pdf_simples,
)
from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_das
from apps.fiscal.tests.test_obrigacoes_parsers import SIMPLES_TEXTO


@pytest.mark.django_db
def test_valor_das_vem_do_anexo_simples_nacional():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        valor=Decimal("1154.05"),
        descricao="DAS errado",
    )
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.SIMPLES,
        nome_original="ZFW - SIMPLES NACIONAL 01-2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.DAS,
            "tipo_anexo": TipoAnexoObrigacaoFiscalChoices.SIMPLES,
            "valor": "26610.30",
            "sucesso": True,
            "linhas_composicao": [
                {"codigo": "1006", "descricao": "INSS", "valor": "8008.93"},
            ],
        },
        parse_sucesso=True,
    )

    valor, anexo = valor_das_pdf_simples(pacote)
    assert valor == Decimal("26610.30")
    assert anexo is not None

    reparar_das_de_anexo_simples(pacote)
    das = pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.DAS)
    assert das.valor == Decimal("26610.30")
    assert das.linhas_composicao.filter(codigo="1006").first().valor == Decimal("8008.93")

    rec = reconciliar_das(pacote)
    assert rec.valor_contabilidade == Decimal("26610.30")


@pytest.mark.django_db
def test_reparse_anexo_simples_misclassified_como_darf():
    """Anexo importado como DARF sem composição é reprocessado a partir do texto do PDF."""
    from apps.fiscal.services.obrigacoes.parsers.simples import parse_simples

    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        valor=Decimal("1154.05"),
    )
    parsed_errado = parse_simples(SIMPLES_TEXTO)
    parsed_errado["tipo_anexo"] = TipoAnexoObrigacaoFiscalChoices.DARF
    parsed_errado.pop("linhas_composicao", None)

    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.DARF,
        nome_original="ZFW - SIMPLES NACIONAL 01-2026.pdf",
        parsed_data={
            **parsed_errado,
            "texto_preview": SIMPLES_TEXTO,
        },
        parse_sucesso=True,
    )

    from apps.fiscal.services.obrigacoes.das_simples import (
        garantir_das_do_pdf,
        valor_linha_composicao_pdf_simples,
    )

    garantir_das_de_anexo = garantir_das_do_pdf(pacote)
    assert garantir_das_de_anexo is not None
    assert garantir_das_de_anexo.valor == Decimal("26610.30")
    assert valor_linha_composicao_pdf_simples(pacote, "1006") == Decimal("8008.93")

    anexo = pacote.anexos.get()
    assert anexo.tipo_arquivo == TipoAnexoObrigacaoFiscalChoices.SIMPLES
    assert anexo.parsed_data.get("linhas_composicao")


@pytest.mark.django_db
def test_sincronizar_obrigacao_das_do_parse():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    from apps.fiscal.services.obrigacoes.parsers.simples import parse_simples

    parsed = parse_simples(SIMPLES_TEXTO)
    obrigacao = sincronizar_obrigacao_das(pacote, parsed)
    assert obrigacao is not None
    assert obrigacao.valor == Decimal("26610.30")
    assert obrigacao.dados_extra.get("fonte_valor") == "pdf_simples_nacional"
