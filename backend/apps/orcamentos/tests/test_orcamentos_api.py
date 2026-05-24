import secrets

import pytest
from decimal import Decimal
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from apps.cadastros.models import ContatoParceiro, ParceiroComercial
from apps.catalogo.models import Produto
from apps.fiscal.models import ItemFiscalProduto
from apps.orcamentos.models import (
    ConfiguracaoMargemCliente,
    Orcamento,
    OrcamentoItem,
    OrigemItemOrcamentoChoices,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)


def _codigo_rev(base: str, revisao: str = "A") -> str:
    return f"{base} Rev {revisao}"
from core.choices.produtos import CategoriaProdutoNomeChoices

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


@pytest.mark.django_db
def test_create_orcamento_gera_codigo_e_vincula_cliente_contato(
    user_admin,
    cliente_com_contato,
):
    user, raw = user_admin
    cliente, contato = cliente_com_contato
    client = _auth_client(user, raw)
    hoje = timezone.localdate()

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Proposta de painel",
            "cliente": str(cliente.id),
            "contato_cliente": str(contato.id),
        },
        format="json",
    )

    assert resp.status_code == 201, resp.content
    body = resp.json()
    base = f"Prop-{hoje.month:02d}001-{hoje.year % 100:02d}"
    assert body["codigo"] == _codigo_rev(base)
    assert body["codigo_base"] == base
    assert body["revisao"] == "A"
    assert body["cliente"] == str(cliente.id)
    assert body["cliente_nome"] == "Cliente Proposta LTDA"
    assert body["contato_cliente"] == str(contato.id)
    orcamento = Orcamento.objects.get(pk=body["id"])
    assert orcamento.cliente == cliente
    assert orcamento.contato_cliente == contato
    assert orcamento.criado_por_id == user.id
    assert orcamento.atualizado_por_id == user.id


@pytest.mark.django_db
def test_patch_orcamento_atualiza_atualizado_por(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-AUDIT", titulo="Audit", status=StatusOrcamentoChoices.RASCUNHO
    )
    assert orc.criado_por_id is None
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(url, {"titulo": "Audit 2"}, format="json")
    assert resp.status_code == 200, resp.content
    orc.refresh_from_db()
    assert orc.atualizado_por_id == user.id
    assert resp.json()["atualizado_por"] == user.id


@pytest.mark.django_db
def test_create_orcamento_incrementa_codigo_no_mes(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    client = _auth_client(user, raw)
    hoje = timezone.localdate()

    primeiro = client.post(
        reverse("erp-orcamento-list"),
        {"titulo": "Primeira", "cliente": str(cliente.id)},
        format="json",
    )
    segundo = client.post(
        reverse("erp-orcamento-list"),
        {"titulo": "Segunda", "cliente": str(cliente.id)},
        format="json",
    )

    assert primeiro.status_code == 201
    assert segundo.status_code == 201
    base1 = f"Prop-{hoje.month:02d}001-{hoje.year % 100:02d}"
    base2 = f"Prop-{hoje.month:02d}002-{hoje.year % 100:02d}"
    assert primeiro.json()["codigo"] == _codigo_rev(base1)
    assert segundo.json()["codigo"] == _codigo_rev(base2)


@pytest.mark.django_db
def test_create_orcamento_pula_codigo_existente_no_mes(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    client = _auth_client(user, raw)
    hoje = timezone.localdate()
    codigo_existente = f"Prop-{hoje.month:02d}001-{hoje.year % 100:02d}"
    Orcamento.objects.create(codigo_base=codigo_existente, titulo="Legado")

    resp = client.post(
        reverse("erp-orcamento-list"),
        {"titulo": "Nova", "cliente": str(cliente.id)},
        format="json",
    )

    assert resp.status_code == 201
    assert resp.json()["codigo"] == _codigo_rev(f"Prop-{hoje.month:02d}002-{hoje.year % 100:02d}")


@pytest.mark.django_db
def test_create_orcamento_aplica_margens_do_cliente(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    ConfiguracaoMargemCliente.objects.create(
        cliente=cliente,
        margem_produtos_percentual="10.00",
        margem_servicos_percentual="25.00",
    )
    client = _auth_client(user, raw)

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Com margens",
            "cliente": str(cliente.id),
            "itens": [
                {
                    "tipo": "PRODUTO",
                    "descricao": "Material",
                    "quantidade": "1",
                    "custo_unitario": "100.00",
                },
                {
                    "tipo": "SERVICO",
                    "descricao": "Montagem",
                    "quantidade": "1",
                    "custo_unitario": "200.00",
                },
            ],
        },
        format="json",
    )

    assert resp.status_code == 201, resp.content
    orcamento = Orcamento.objects.get(pk=resp.json()["id"])
    itens = list(orcamento.itens.order_by("ordem"))
    assert orcamento.margem_produtos_percentual == 10
    assert orcamento.margem_servicos_percentual == 25
    assert itens[0].margem_percentual == 10
    assert itens[0].preco_unitario == 110
    assert itens[1].margem_percentual == 25
    assert itens[1].preco_unitario == 250


@pytest.mark.django_db
def test_create_orcamento_rejeita_contato_de_outro_cliente(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    outro = ParceiroComercial.objects.create(
        documento="98765432000199",
        razao_social="Outro Cliente LTDA",
        eh_cliente=True,
    )
    contato_outro = ContatoParceiro.objects.create(parceiro=outro, nome="Contato errado")
    client = _auth_client(user, raw)

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Contato inválido",
            "cliente": str(cliente.id),
            "contato_cliente": str(contato_outro.id),
        },
        format="json",
    )

    assert resp.status_code == 400
    assert "contato" in str(resp.data).lower()


@pytest.mark.django_db
def test_patch_orcamento_sem_itens_preserva_linhas(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-1",
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
def test_create_orcamento_item_produto_catalogo_preco_e_ipi(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    produto = Produto.objects.create(
        codigo="CAT-ORC-001",
        descricao="Produto lista IPI",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="150.00",
    )
    ItemFiscalProduto.objects.create(produto=produto, ordem=0, rotulo="", p_ipi="5.2500")
    client = _auth_client(user, raw)

    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Com produto catalogo",
            "cliente": str(cliente.id),
            "margem_produtos_percentual": "10.00",
            "itens": [
                {"produto": str(produto.id), "quantidade": "2"},
            ],
        },
        format="json",
    )

    assert resp.status_code == 201, resp.content
    item = OrcamentoItem.objects.get(orcamento_id=resp.json()["id"])
    assert item.produto_id == produto.id
    assert item.origem == OrigemItemOrcamentoChoices.CATALOGO
    assert item.tipo == TipoItemOrcamentoChoices.PRODUTO
    assert item.descricao == produto.descricao
    assert item.custo_unitario == 150
    assert item.margem_percentual == 10
    assert item.preco_unitario == Decimal("172.8750")
    assert item.aliquota_ipi == 5.25


@pytest.mark.django_db
def test_create_orcamento_item_servico_com_produto_rejeita(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    produto = Produto.objects.create(
        codigo="CAT-ORC-002",
        descricao="X",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="1.00",
    )
    client = _auth_client(user, raw)
    resp = client.post(
        reverse("erp-orcamento-list"),
        {
            "titulo": "Invalido",
            "cliente": str(cliente.id),
            "itens": [
                {"tipo": "SERVICO", "produto": str(produto.id), "descricao": "Servico misto"},
            ],
        },
        format="json",
    )
    assert resp.status_code == 400


@pytest.mark.django_db
def test_patch_orcamento_ignora_ipi_informado_na_linha(user_admin, cliente_com_contato):
    user, raw = user_admin
    cliente, _contato = cliente_com_contato
    produto = Produto.objects.create(
        codigo="CAT-IPI-LOCK",
        descricao="Produto IPI fixo",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        preco_base="100.00",
    )
    ItemFiscalProduto.objects.create(produto=produto, ordem=0, rotulo="", p_ipi="7.5000")
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-IPI",
        titulo="IPI",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    item = OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        descricao=produto.descricao,
        produto=produto,
        origem=OrigemItemOrcamentoChoices.CATALOGO,
        quantidade=1,
        custo_unitario=100,
        preco_unitario=110,
        aliquota_ipi=7.5,
    )
    url = reverse("erp-orcamento-detail", kwargs={"pk": orc.pk})
    resp = client.patch(
        url,
        {
            "itens": [
                {
                    "id": str(item.id),
                    "ordem": 0,
                    "descricao": produto.descricao,
                    "quantidade": "1",
                    "custo_unitario": "100",
                    "preco_unitario": "110",
                    "aliquota_ipi": "99.99",
                }
            ]
        },
        format="json",
    )
    assert resp.status_code == 200, resp.content
    item.refresh_from_db()
    assert item.aliquota_ipi == 7.5


@pytest.mark.django_db
def test_patch_orcamento_sync_itens_atualiza_adiciona_remove(user_admin):
    user, raw = user_admin
    client = _auth_client(user, raw)
    orc = Orcamento.objects.create(
        codigo_base="O-2",
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
