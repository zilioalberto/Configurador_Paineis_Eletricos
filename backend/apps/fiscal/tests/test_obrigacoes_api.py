"""Testes API de obrigações fiscais."""
import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from unittest.mock import patch
from rest_framework.test import APIClient

from apps.fiscal.models_obrigacoes import (
    AnexoObrigacaoFiscal,
    HoleriteCompetencia,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
)
from apps.fiscal.choices import TipoObrigacaoFiscalChoices
from apps.rh.models import Colaborador
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()
CNPJ_ZFW = "07284171000139"


@pytest.fixture
def api_client_fiscal():
    client = APIClient()
    user = User.objects.create_user(
        email="fiscal_obrig@test.com",
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


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_criar_pacote_e_dashboard(api_client_fiscal):
    resp = api_client_fiscal.post(
        "/api/v1/fiscal/obrigacoes/pacotes/criar/",
        {"competencia": "2026-03"},
        format="json",
    )
    assert resp.status_code == 201
    assert resp.data["competencia"] == "2026-03"
    assert PacoteObrigacaoFiscal.objects.filter(competencia="2026-03").exists()

    dash = api_client_fiscal.get("/api/v1/fiscal/obrigacoes/dashboard/")
    assert dash.status_code == 200
    assert "total_pendente" in dash.data


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_atualizar_obrigacao_patch(api_client_fiscal):
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-03")
    obrigacao = ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        descricao="DAS março",
        valor=Decimal("0.00"),
    )
    resp = api_client_fiscal.patch(
        f"/api/v1/fiscal/obrigacoes/itens/{obrigacao.public_id}/",
        {
            "valor": "1523.45",
            "data_vencimento": "2026-04-20",
            "descricao": "DAS março (manual)",
            "observacoes": "PDF escaneado",
        },
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["valor"] == "1523.45"
    assert resp.data["data_vencimento"] == "2026-04-20"
    assert resp.data["descricao"] == "DAS março (manual)"
    assert resp.data["observacoes"] == "PDF escaneado"
    obrigacao.refresh_from_db()
    assert obrigacao.valor == Decimal("1523.45")

    from apps.fiscal.choices import TipoReconciliacaoFiscalChoices
    from apps.fiscal.models_obrigacoes import ReconciliacaoFiscal

    rec = ReconciliacaoFiscal.objects.get(
        pacote=pacote,
        tipo=TipoReconciliacaoFiscalChoices.DAS,
    )
    assert rec.valor_contabilidade == Decimal("1523.45")


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_importar_simples_nacional_popula_das_e_conciliacao(monkeypatch):
    from django.core.files.uploadedfile import SimpleUploadedFile

    from apps.fiscal.choices import TipoReconciliacaoFiscalChoices
    from apps.fiscal.models_obrigacoes import ReconciliacaoFiscal
    from apps.fiscal.services.obrigacoes.importar_pacote import importar_anexo_pdf
    from apps.fiscal.services.obrigacoes.reconciliacao import executar_reconciliacao_pacote
    from apps.fiscal.tests.test_obrigacoes_parsers import SIMPLES_TEXTO

    monkeypatch.setattr(
        "apps.fiscal.services.obrigacoes.parse_pdf.extrair_texto_pdf",
        lambda _bytes: SIMPLES_TEXTO,
    )

    pacote = PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-01")
    arquivo = SimpleUploadedFile(
        "ZFW - SIMPLES NACIONAL 01-2026.pdf",
        b"%PDF-1.4 mock",
        content_type="application/pdf",
    )
    importar_anexo_pdf(
        pacote=pacote,
        arquivo=arquivo,
        nome_original=arquivo.name,
    )
    executar_reconciliacao_pacote(pacote)

    das = pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.DAS)
    assert das.valor == Decimal("26610.30")
    assert das.linhas_composicao.filter(codigo="1006").first().valor == Decimal("8008.93")
    assert not pacote.obrigacoes.filter(tipo=TipoObrigacaoFiscalChoices.INSS_DARF).exists()

    rec = ReconciliacaoFiscal.objects.get(
        pacote=pacote,
        tipo=TipoReconciliacaoFiscalChoices.DAS,
    )
    assert rec.valor_contabilidade == Decimal("26610.30")


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_importar_darf_inss_popula_obrigacao_e_conciliacao(monkeypatch):
    from django.core.files.uploadedfile import SimpleUploadedFile

    from apps.fiscal.choices import TipoReconciliacaoFiscalChoices
    from apps.fiscal.models_obrigacoes import ReconciliacaoFiscal
    from apps.fiscal.services.obrigacoes.importar_pacote import importar_anexo_pdf
    from apps.fiscal.services.obrigacoes.reconciliacao import executar_reconciliacao_pacote
    from apps.fiscal.tests.test_obrigacoes_parsers import DARF_TEXTO

    monkeypatch.setattr(
        "apps.fiscal.services.obrigacoes.parse_pdf.extrair_texto_pdf",
        lambda _bytes: DARF_TEXTO,
    )

    pacote = PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-03")
    arquivo = SimpleUploadedFile(
        "DARF INSS 03-2026.pdf",
        b"%PDF-1.4 mock",
        content_type="application/pdf",
    )
    importar_anexo_pdf(
        pacote=pacote,
        arquivo=arquivo,
        nome_original=arquivo.name,
    )
    executar_reconciliacao_pacote(pacote)

    darf = pacote.obrigacoes.get(tipo=TipoObrigacaoFiscalChoices.INSS_DARF)
    assert darf.valor == Decimal("1118.26")

    rec = ReconciliacaoFiscal.objects.get(
        pacote=pacote,
        tipo=TipoReconciliacaoFiscalChoices.INSS,
    )
    assert rec.valor_contabilidade == Decimal("1118.26")


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_patch_das_manual_com_composicao_quando_pdf_escaneado(api_client_fiscal):
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-03")
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo="SIMPLES",
        nome_original="ZFW - SIMPLES NACIONAL 03-2026.pdf",
        parsed_data={"sucesso": False, "erros": ["PDF escaneado"]},
        parse_sucesso=False,
    )
    das = ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        valor=Decimal("0"),
        dados_extra={"fonte_valor": "manual", "pdf_escaneado": True},
    )

    resp = api_client_fiscal.patch(
        f"/api/v1/fiscal/obrigacoes/itens/{das.public_id}/",
        {
            "valor": "14500.00",
            "descricao": "DAS março manual",
            "linhas_composicao": [
                {"codigo": "1006", "descricao": "INSS", "valor": "4200.50"},
            ],
        },
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["valor"] == "14500.00"
    assert resp.data["dados_extra"]["fonte_valor"] == "manual"
    assert len(resp.data["linhas_composicao"]) == 1
    assert resp.data["linhas_composicao"][0]["codigo"] == "1006"

    from apps.fiscal.services.obrigacoes.reconciliacao import reconciliar_das_inss_holerites

    rec = reconciliar_das_inss_holerites(pacote)
    assert rec.valor_contabilidade == Decimal("4200.50")


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_patch_das_com_pdf_bloqueia_valor(api_client_fiscal):
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-01")
    das = ObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo=TipoObrigacaoFiscalChoices.DAS,
        valor=Decimal("26610.30"),
        dados_extra={"fonte_valor": "pdf_simples_nacional"},
    )
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo="SIMPLES",
        nome_original="ZFW - SIMPLES NACIONAL 01-2026.pdf",
        parsed_data={"valor": "26610.30", "tipo_obrigacao": "DAS", "sucesso": True},
        parse_sucesso=True,
        obrigacao=das,
    )

    resp = api_client_fiscal.patch(
        f"/api/v1/fiscal/obrigacoes/itens/{das.public_id}/",
        {"valor": "999.99", "descricao": "manual"},
        format="json",
    )
    assert resp.status_code == 400

    resp_ok = api_client_fiscal.patch(
        f"/api/v1/fiscal/obrigacoes/itens/{das.public_id}/",
        {"observacoes": "conferido", "data_vencimento": "2026-02-20"},
        format="json",
    )
    assert resp_ok.status_code == 200
    assert resp_ok.data["observacoes"] == "conferido"


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_atualizar_holerite_vincular_colaborador(api_client_fiscal):
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-03")
    colaborador = Colaborador.objects.create(matricula="001", nome="ALICE ZILIO", ativo=True)
    holerite = HoleriteCompetencia.objects.create(
        pacote=pacote,
        nome="ALICE ZILIO",
        cpf="",
        proventos=Decimal("1596.94"),
    )
    resp = api_client_fiscal.patch(
        f"/api/v1/fiscal/obrigacoes/holerites/{holerite.id}/",
        {"colaborador_id": str(colaborador.id), "nome": "ALICE ZILIO"},
        format="json",
    )
    assert resp.status_code == 200
    assert resp.data["colaborador_id"] == str(colaborador.id)
    assert resp.data["vinculo_rh"] == "VINCULADO"


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_excluir_todos_anexos_pacote(api_client_fiscal):
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-04", pacote_completo=True)
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo="DARF",
        nome_original="DARF 04.2026.pdf",
        arquivo="fiscal/obrigacoes/2026-04/darf.pdf",
    )
    AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo="SIMPLES",
        nome_original="ZFW - SIMPLES NACIONAL 04-2026.pdf",
        arquivo="fiscal/obrigacoes/2026-04/simples.pdf",
    )

    with patch("django.db.models.fields.files.FieldFile.delete") as delete_mock:
        resp = api_client_fiscal.delete(
            f"/api/v1/fiscal/obrigacoes/pacotes/{pacote.public_id}/anexos/"
        )

    assert resp.status_code == 200
    assert resp.data["excluidos"] == 2
    assert resp.data["pacote"]["anexos"] == []
    assert delete_mock.call_count == 2
    pacote.refresh_from_db()
    assert pacote.pacote_completo is False
    assert pacote.anexos.count() == 0


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_excluir_anexo_obrigacao_remove_registro_e_arquivo(api_client_fiscal):
    pacote = PacoteObrigacaoFiscal.objects.create(cnpj=CNPJ_ZFW, competencia="2026-03")
    anexo = AnexoObrigacaoFiscal.objects.create(
        pacote=pacote,
        tipo_arquivo="DARF",
        nome_original="darf-marco.pdf",
        arquivo="fiscal/obrigacoes/2026-03/teste-delete.pdf",
    )

    with patch("django.db.models.fields.files.FieldFile.delete") as delete_mock:
        resp = api_client_fiscal.delete(f"/api/v1/fiscal/obrigacoes/anexos/{anexo.public_id}/")

    assert resp.status_code == 204
    delete_mock.assert_called_once()
    assert not AnexoObrigacaoFiscal.objects.filter(pk=anexo.pk).exists()
