"""Testes HTTP da API de serviços do catálogo."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.catalogo.models import Servico
from core.choices.produtos import UnidadeMedidaChoices
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()


def _auth_client(email: str, password: str) -> APIClient:
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": email, "password": password},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.fixture
def admin_client():
    raw = "servico-api-test-pass-12345"
    user = User.objects.create_user(
        email="servico-api-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
        first_name="Admin",
        last_name="Srv",
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
def test_create_servico_catalogo(admin_client):
    client, _user = admin_client
    resp = client.post(
        reverse("catalogo-servicos-list"),
        {
            "codigo": "SRV-MONT-01",
            "descricao": "Montagem de painel",
            "categoria": "Montagem",
            "preco_base": "450.00",
        },
        format="json",
    )
    assert resp.status_code == 201, resp.content
    data = resp.json()
    assert data["codigo"] == "SRV-MONT-01"
    assert data["unidade_medida"] == UnidadeMedidaChoices.HORAS
    assert Servico.objects.filter(codigo="SRV-MONT-01").exists()


@pytest.mark.django_db
def test_busca_servico_autocomplete(admin_client):
    client, _user = admin_client
    Servico.objects.create(
        codigo="SRV-ENG-01",
        descricao="Engenharia detalhada",
        categoria="Engenharia",
        preco_base="120.00",
        ativo=True,
    )
    Servico.objects.create(
        codigo="SRV-INAT",
        descricao="Servico inativo engenharia",
        ativo=False,
    )

    resp = client.get(reverse("catalogo-servicos-list"), {"search": "engenharia"})
    assert resp.status_code == 200
    payload = resp.json()
    items = payload["results"] if isinstance(payload, dict) and "results" in payload else payload
    assert len(items) == 1
    assert items[0]["codigo"] == "SRV-ENG-01"
