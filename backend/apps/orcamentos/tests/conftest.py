"""Fixtures compartilhadas dos testes de orçamentos."""

import secrets

import pytest
from django.contrib.auth import get_user_model

from apps.cadastros.models import ContatoParceiro, ParceiroComercial

User = get_user_model()


@pytest.fixture
def user_admin():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_superuser(
        email="orcamentos-admin@test.com",
        password=raw,
        is_active=True,
    )
    return user, raw


@pytest.fixture
def cliente_com_contato():
    cliente = ParceiroComercial.objects.create(
        documento="12345678000199",
        razao_social="Cliente Proposta LTDA",
        eh_cliente=True,
    )
    contato = ContatoParceiro.objects.create(
        parceiro=cliente,
        nome="Compras Cliente",
        email="compras@example.com",
        principal=True,
    )
    return cliente, contato
