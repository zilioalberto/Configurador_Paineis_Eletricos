import secrets

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.orcamentos.models import Orcamento, OrcamentoItem, StatusOrcamentoChoices

User = get_user_model()


def _auth_client(user, password):
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": password},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.fixture
def user_admin():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_superuser(
        email="orcamentos-admin@test.com",
        password=raw,
        is_active=True,
    )
    return user, raw


@pytest.mark.django_db
def test_patch_orcamento_sem_itens_preserva_linhas(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo="O-1",
        titulo="Teste",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    i1 = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        descricao="A",
        quantidade=1,
        preco_unitario=10,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=1,
        descricao="B",
        quantidade=2,
        preco_unitario=5,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(url, {"titulo": "Só cabeçalho"}, format="json")
    assert resp.status_code == 200
    assert OrcamentoItem.objects.filter(orcamento=orc).count() == 2
    assert Orcamento.objects.get(pk=orc.pk).titulo == "Só cabeçalho"
    assert OrcamentoItem.objects.filter(pk=i1.pk).exists()


@pytest.mark.django_db
def test_patch_orcamento_sync_itens_atualiza_adiciona_remove(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo="O-2",
        titulo="Itens",
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    manter = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        descricao="Manter",
        quantidade=1,
        preco_unitario=100,
    )
    remover = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=1,
        descricao="Remover",
        quantidade=1,
        preco_unitario=1,
    )

    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(
        url,
        {
            "itens": [
                {
                    "id": str(manter.id),
                    "ordem": 0,
                    "descricao": "Manter editado",
                    "quantidade": "2",
                    "preco_unitario": "50",
                },
                {
                    "ordem": 1,
                    "descricao": "Linha nova",
                    "quantidade": "1",
                    "preco_unitario": "10",
                },
            ]
        },
        format="json",
    )
    assert resp.status_code == 200, resp.content
    assert not OrcamentoItem.objects.filter(pk=remover.pk).exists()
    assert OrcamentoItem.objects.filter(orcamento=orc).count() == 2
    manter_db = OrcamentoItem.objects.get(pk=manter.pk)
    assert manter_db.descricao == "Manter editado"
    novo = OrcamentoItem.objects.exclude(pk=manter.pk).get(orcamento=orc)
    assert novo.descricao == "Linha nova"
