"""Testes de API das NFS-es recebidas (ADN) e sincronização."""
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.fiscal.models import ControleNsuNfseAdn, DocumentoNfseRecebido
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()
CNPJ_ZFW = "07284171000139"
CNPJ_PREST = "11222333000181"
VIEWS = "apps.fiscal.api.nfse_recebida_views"


@pytest.fixture
def client_fiscal(db):
    client = APIClient()
    user = User.objects.create_user(
        email="nfse_rec@test.com",
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


def _doc(identificador, numero="100", origem="MANUAL", cnpj_prest=CNPJ_PREST):
    return DocumentoNfseRecebido.objects.create(
        identificador=identificador,
        cnpj_prestador=cnpj_prest,
        cnpj_tomador=CNPJ_ZFW,
        numero=numero,
        valor_total=Decimal("500.00"),
        origem_importacao=origem,
    )


@pytest.mark.django_db
def test_listar_filtrar_e_detalhar_nfse_recebida(client_fiscal):
    d1 = _doc("nfse-1", numero="100")
    _doc("nfse-2", numero="200", cnpj_prest="99888777000166")

    lista = client_fiscal.get("/api/v1/fiscal/nfse-recebidas/")
    assert lista.status_code == 200
    assert lista.data["count"] == 2

    filtro_num = client_fiscal.get("/api/v1/fiscal/nfse-recebidas/?numero=100")
    assert filtro_num.data["count"] == 1

    filtro_prest = client_fiscal.get(
        f"/api/v1/fiscal/nfse-recebidas/?cnpj_prestador={CNPJ_PREST}"
    )
    assert filtro_prest.data["count"] == 1

    filtro_origem = client_fiscal.get(
        "/api/v1/fiscal/nfse-recebidas/?origem_importacao=MANUAL"
    )
    assert filtro_origem.data["count"] == 2

    detalhe = client_fiscal.get(f"/api/v1/fiscal/nfse-recebidas/{d1.public_id}/")
    assert detalhe.status_code == 200
    assert detalhe.data["numero"] == "100"


@pytest.mark.django_db
def test_controle_nsu_get_valido_e_invalido(client_fiscal):
    resp = client_fiscal.get(f"/api/v1/fiscal/nsu-nfse-adn/{CNPJ_ZFW}/")
    assert resp.status_code == 200
    assert ControleNsuNfseAdn.objects.filter(cnpj=CNPJ_ZFW).exists()

    invalido = client_fiscal.get("/api/v1/fiscal/nsu-nfse-adn/123/")
    assert invalido.status_code == 400


@pytest.mark.django_db
def test_sincronizar_adn_indisponivel_retorna_503(client_fiscal):
    fake_status = SimpleNamespace(
        nfse_adn_sync_disponivel=False,
        nfse_adn_sync_mensagem="ADN não configurado.",
    )
    with patch(f"{VIEWS}.montar_status_nfse_adn_sync", return_value=fake_status):
        resp = client_fiscal.post("/api/v1/fiscal/nfse-recebidas/sincronizar-adn/")
    assert resp.status_code == 503
    assert resp.data["detail"] == "ADN não configurado."


@pytest.mark.django_db
def test_sincronizar_adn_config_invalida_retorna_400(client_fiscal):
    fake_status = SimpleNamespace(nfse_adn_sync_disponivel=True, nfse_adn_sync_mensagem="")
    fake_config = SimpleNamespace(
        cnpj=CNPJ_ZFW, validate=lambda: (_ for _ in ()).throw(ValueError("certificado ausente"))
    )
    with patch(f"{VIEWS}.montar_status_nfse_adn_sync", return_value=fake_status), patch(
        f"{VIEWS}.get_nfse_adn_config", return_value=fake_config
    ):
        resp = client_fiscal.post("/api/v1/fiscal/nfse-recebidas/sincronizar-adn/")
    assert resp.status_code == 400
    assert "certificado" in resp.data["detail"]


@pytest.mark.django_db
def test_sincronizar_adn_sucesso_e_falha(client_fiscal):
    fake_status = SimpleNamespace(nfse_adn_sync_disponivel=True, nfse_adn_sync_mensagem="")
    fake_config = SimpleNamespace(cnpj=CNPJ_ZFW, validate=lambda: None)

    def _resultado(sucesso):
        return SimpleNamespace(
            sucesso=sucesso,
            mensagem="ok" if sucesso else "erro",
            ciclos_executados=1,
            documentos_importados=2,
            documentos_novos=2,
            documentos_duplicados=0,
            erros_importacao=[],
            alertas=[],
            ultimo_status="138" if sucesso else "137",
            ultimo_motivo="" if sucesso else "Nenhum documento",
            ultimo_nsu="000000000000010",
            max_nsu="000000000000010",
        )

    with patch(f"{VIEWS}.montar_status_nfse_adn_sync", return_value=fake_status), patch(
        f"{VIEWS}.get_nfse_adn_config", return_value=fake_config
    ), patch(f"{VIEWS}.executar_sincronizacao_nfse_adn", return_value=_resultado(True)):
        ok = client_fiscal.post("/api/v1/fiscal/nfse-recebidas/sincronizar-adn/")
    assert ok.status_code == 200
    assert ok.data["documentos_importados"] == 2

    with patch(f"{VIEWS}.montar_status_nfse_adn_sync", return_value=fake_status), patch(
        f"{VIEWS}.get_nfse_adn_config", return_value=fake_config
    ), patch(f"{VIEWS}.executar_sincronizacao_nfse_adn", return_value=_resultado(False)):
        falha = client_fiscal.post("/api/v1/fiscal/nfse-recebidas/sincronizar-adn/")
    assert falha.status_code == 422
    assert "detail" in falha.data


@pytest.mark.django_db
def test_sincronizar_adn_excecao_inesperada_retorna_500(client_fiscal):
    fake_status = SimpleNamespace(nfse_adn_sync_disponivel=True, nfse_adn_sync_mensagem="")
    fake_config = SimpleNamespace(cnpj=CNPJ_ZFW, validate=lambda: None)
    with patch(f"{VIEWS}.montar_status_nfse_adn_sync", return_value=fake_status), patch(
        f"{VIEWS}.get_nfse_adn_config", return_value=fake_config
    ), patch(f"{VIEWS}.executar_sincronizacao_nfse_adn", side_effect=RuntimeError("boom")):
        resp = client_fiscal.post("/api/v1/fiscal/nfse-recebidas/sincronizar-adn/")
    assert resp.status_code == 500
