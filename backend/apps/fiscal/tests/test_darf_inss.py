"""Testes da guia DARF INSS (PDF federal, separado do DAS)."""
from decimal import Decimal

import pytest

from apps.fiscal.choices import TipoAnexoObrigacaoFiscalChoices, TipoObrigacaoFiscalChoices
from apps.fiscal.models_obrigacoes import AnexoObrigacaoFiscal, ObrigacaoFiscal, PacoteObrigacaoFiscal
from apps.fiscal.services.obrigacoes.darf_inss import (
    garantir_inss_darf_do_pdf,
    limpar_inss_darf_contaminado,
    valor_darf_pdf,
    valor_parece_das_contaminado,
)
from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_inss
from apps.fiscal.tests.test_obrigacoes_parsers import DARF_TEXTO, SIMPLES_TEXTO


@pytest.mark.django_db
def test_valor_darf_vem_do_anexo_darf():
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-03")
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.DARF,
        nome_original="DARF 03.2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.INSS_DARF,
            "tipo_anexo": TipoAnexoObrigacaoFiscalChoices.DARF,
            "valor": "1118.26",
            "sucesso": True,
            "texto_preview": DARF_TEXTO,
            "linhas_composicao": [
                {"codigo": "1082", "descricao": "CONTR PREV", "valor": "279.95"},
            ],
        },
        parse_sucesso=True,
    )

    valor, anexo = valor_darf_pdf(pacote)
    assert valor == Decimal("1118.26")
    assert anexo is not None

    obrigacao = garantir_inss_darf_do_pdf(pacote)
    assert obrigacao is not None
    assert obrigacao.valor == Decimal("1118.26")
    assert obrigacao.dados_extra.get("fonte_valor") == "pdf_darf"


@pytest.mark.django_db
def test_inss_darf_nao_usa_valor_do_das_simples():
    """R$ 9.906,88 é total do DAS — não deve aparecer na linha INSS DARF × holerites."""
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-05")
    ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.INSS_DARF,
        valor=Decimal("9906.88"),
        descricao="INSS errado (valor do DAS)",
    )
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.SIMPLES,
        nome_original="ZFW - SIMPLES NACIONAL 05-2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.DAS,
            "tipo_anexo": TipoAnexoObrigacaoFiscalChoices.SIMPLES,
            "valor": "9906.88",
            "sucesso": True,
            "texto_preview": SIMPLES_TEXTO,
            "linhas_composicao": [
                {"codigo": "1006", "descricao": "INSS - SIMPLES NACIONAL", "valor": "6168.96"},
            ],
        },
        parse_sucesso=True,
    )

    parsed_simples = {
        "tipo_obrigacao": TipoObrigacaoFiscalChoices.INSS_DARF,
        "valor": "9906.88",
        "linhas_composicao": [],
    }
    assert valor_parece_das_contaminado(pacote, parsed_simples)

    limpar_inss_darf_contaminado(pacote)
    darf = pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.INSS_DARF)
    assert darf.valor == Decimal("0")
    assert darf.dados_extra.get("valor_das_removido") is True

    rec = reconciliar_inss(pacote)
    assert rec.valor_contabilidade is None


@pytest.mark.django_db
def test_reparse_simples_misclassified_como_darf_nao_contamina_inss():
    from apps.fiscal.services.obrigacoes.parsers.simples import parse_simples

    pacote = PacoteObrigacaoFiscal.objects.create(cnpj="07284171000139", competencia="2026-01")
    parsed_errado = parse_simples(SIMPLES_TEXTO)
    parsed_errado["tipo_anexo"] = TipoAnexoObrigacaoFiscalChoices.DARF
    parsed_errado["tipo_obrigacao"] = TipoObrigacaoFiscalChoices.INSS_DARF

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
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo=TipoAnexoObrigacaoFiscalChoices.DARF,
        nome_original="DARF 01.2026.pdf",
        parsed_data={
            "tipo_obrigacao": TipoObrigacaoFiscalChoices.INSS_DARF,
            "tipo_anexo": TipoAnexoObrigacaoFiscalChoices.DARF,
            "valor": "1154.05",
            "sucesso": True,
            "texto_preview": DARF_TEXTO.replace("1.118,26", "1.154,05").replace("Março", "Janeiro"),
            "linhas_composicao": [
                {"codigo": "1082", "descricao": "CONTR PREV", "valor": "288.44"},
            ],
        },
        parse_sucesso=True,
    )

    obrigacao = garantir_inss_darf_do_pdf(pacote)
    assert obrigacao is not None
    assert obrigacao.valor == Decimal("1154.05")
