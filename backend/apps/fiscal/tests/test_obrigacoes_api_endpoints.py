"""Testes de API dos endpoints de obrigações fiscais (cobertura de views/serializers)."""
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APIClient

from apps.fiscal.choices import (
    TipoObrigacaoFiscalChoices,
    TipoReconciliacaoFiscalChoices,
)
from apps.fiscal.models_obrigacoes import (
    HoleriteCompetencia,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
)
from apps.fiscal.tests.test_obrigacoes_parsers import SIMPLES_TEXTO
from apps.rh.models import Colaborador
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()
CNPJ_ZFW = "07284171000139"
PARSE_PATH = "apps.fiscal.services.obrigacoes.parse_pdf.extrair_texto_pdf"


@pytest.fixture
def client_fiscal():
    client = APIClient()
    user = User.objects.create_user(
        email="obrig_endpoints@test.com",
        password="pass12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


def _pacote(competencia="2026-03", **kwargs):
    return PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia=competencia, **kwargs)


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_listar_e_detalhar_pacotes(client_fiscal):
    pacote = _pacote(observacoes="março")
    ObrigacaoFiscal.objects.create(
        pacote=pacote, tipo=TipoObrigacaoFiscalChoices.DAS, valor=Decimal("100.00")
    )

    lista = client_fiscal.get("/api/v1/fiscal/obrigacoes/pacotes/")
    assert lista.status_code == 200
    assert lista.data["count"] == 1
    assert lista.data["results"][0]["competencia"] == "2026-03"
    assert lista.data["results"][0]["total_obrigacoes"] == 1

    detalhe = client_fiscal.get(f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/")
    assert detalhe.status_code == 200
    assert detalhe.data["cnpj"] == CNPJ_ZFW
    assert len(detalhe.data["obrigacoes"]) == 1


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ="")
def test_listar_pacotes_sem_cnpj_configurado(client_fiscal):
    resp = client_fiscal.get("/api/v1/fiscal/obrigacoes/pacotes/")
    assert resp.status_code == 400
    dash = client_fiscal.get("/api/v1/fiscal/obrigacoes/dashboard/")
    assert dash.status_code == 400


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_upload_anexo_via_api(client_fiscal):
    pacote = _pacote(competencia="2026-01")
    arquivo = SimpleUploadedFile(
        "ZFW - SIMPLES NACIONAL 01-2026.pdf", b"%PDF-1.4 mock", content_type="application/pdf"
    )
    with patch(PARSE_PATH, return_value=SIMPLES_TEXTO):
        resp = client_fiscal.post(
            f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/upload/",
            {"arquivo": arquivo},
            format="multipart",
        )
    assert resp.status_code == 201
    assert resp.data["pacote"]["obrigacoes"]
    assert pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.DAS).exists()


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_upload_lote_e_sem_arquivos(client_fiscal):
    pacote = _pacote(competencia="2026-01")
    f1 = SimpleUploadedFile(
        "ZFW - SIMPLES NACIONAL 01-2026.pdf", b"%PDF mock1", content_type="application/pdf"
    )
    with patch(PARSE_PATH, return_value=SIMPLES_TEXTO):
        ok = client_fiscal.post(
            f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/upload-lote/",
            {"arquivos": [f1]},
            format="multipart",
        )
    assert ok.status_code == 201
    assert ok.data["importados"] == 1

    vazio = client_fiscal.post(
        f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/upload-lote/",
        {},
        format="multipart",
    )
    assert vazio.status_code == 400


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_reconciliar_pacote_endpoint(client_fiscal):
    pacote = _pacote()
    ObrigacaoFiscal.objects.create(
        pacote=pacote, tipo=TipoObrigacaoFiscalChoices.DAS, valor=Decimal("500.00")
    )
    resp = client_fiscal.post(
        f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/reconciliar/"
    )
    assert resp.status_code == 200
    assert "reconciliacoes" in resp.data
    assert "pacote" in resp.data


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_contabilidade_manual_patch_valido_e_erros(client_fiscal):
    pacote = _pacote()
    base = f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/reconciliacoes"

    ok = client_fiscal.patch(
        f"{base}/{TipoReconciliacaoFiscalChoices.FGTS.value}/contabilidade/",
        {"valor_contabilidade": "500.00"},
        format="json",
    )
    assert ok.status_code == 200
    assert ok.data["reconciliacao"]["valor_contabilidade"] == "500.00"

    invalido = client_fiscal.patch(
        f"{base}/TIPO_INEXISTENTE/contabilidade/",
        {"valor_contabilidade": "10.00"},
        format="json",
    )
    assert invalido.status_code == 400

    erro_valor = client_fiscal.patch(
        f"{base}/{TipoReconciliacaoFiscalChoices.DAS_INSS.value}/contabilidade/",
        {"valor_contabilidade": "0.00"},
        format="json",
    )
    assert erro_valor.status_code == 400


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_marcar_obrigacao_paga_gera_lancamento(client_fiscal):
    pacote = _pacote()
    obrigacao = ObrigacaoFiscal.objects.create(
        pacote=pacote, tipo=TipoObrigacaoFiscalChoices.DAS, valor=Decimal("1200.00")
    )
    resp = client_fiscal.post(
        f"/api/v1/fiscal/obrigacoes/itens/{obrigacao.public_id}/",
        {"data_pagamento": "2026-04-20", "criar_lancamento_financeiro": True},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["data_pagamento"] == "2026-04-20"
    assert resp.data["lancamento_financeiro"] is not None


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_conciliar_holerites_rh_endpoint(client_fiscal):
    pacote = _pacote()
    Colaborador.objects.create(matricula="010", nome="BOB ZILIO", ativo=True)
    HoleriteCompetencia.objects.create(
        pacote=pacote, nome="BOB ZILIO", cpf="", proventos=Decimal("2000.00")
    )
    resp = client_fiscal.post(
        f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/holerites/conciliar-rh/"
    )
    assert resp.status_code == 200
    assert "pacote" in resp.data


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_criar_colaboradores_holerites_id_invalido_e_valido(client_fiscal):
    pacote = _pacote()
    HoleriteCompetencia.objects.create(
        pacote=pacote, nome="CAROL ZILIO", cpf="", proventos=Decimal("1500.00")
    )
    invalido = client_fiscal.post(
        f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/holerites/criar-colaboradores/",
        {"holerite_id": "abc"},
        format="json",
    )
    assert invalido.status_code == 400

    valido = client_fiscal.post(
        f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/holerites/criar-colaboradores/",
        {},
        format="json",
    )
    assert valido.status_code == 200
    assert "pacote" in valido.data
