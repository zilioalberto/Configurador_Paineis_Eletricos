"""Testes HTTP da API de catálogo (views + fluxos list/retrieve/write)."""

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from catalogo.models import Produto
from core.choices.produtos import CategoriaProdutoNomeChoices, UnidadeMedidaChoices
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
    raw = "cat-api-test-pass-12345"
    user = User.objects.create_user(
        email="catalogo-api-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
        first_name="Admin",
        last_name="Cat",
    )
    return _auth_client(user.email, raw), user


@pytest.fixture
def usuario_material_somente_leitura_client():
    """USUARIO tem `material.visualizar_lista` mas não `material.editar_lista`."""
    raw = "cat-read-only-pass-12345"
    user = User.objects.create_user(
        email="catalogo-somente-leitura@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
        first_name="Leitura",
        last_name="Cat",
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
class TestCatalogoPlcFamilias:
    def test_get_retorna_lista_familias(self, admin_client):
        client, _ = admin_client
        url = reverse("catalogo-plc-familias")
        r = client.get(url)
        assert r.status_code == 200
        body = r.json()
        assert "familias" in body
        assert isinstance(body["familias"], list)
        assert len(body["familias"]) >= 1

    def test_get_sem_auth_401(self):
        url = reverse("catalogo-plc-familias")
        r = APIClient().get(url)
        assert r.status_code == 401


@pytest.mark.django_db
class TestCatalogoCategorias:
    def test_list_retorna_choices(self, admin_client):
        client, _ = admin_client
        url = reverse("catalogo-categorias-list")
        r = client.get(url)
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        ids = {row["id"] for row in data}
        assert CategoriaProdutoNomeChoices.CONTATORA in ids


@pytest.mark.django_db
class TestCatalogoProdutos:
    def test_list_paginada_e_filtro_categoria(self, admin_client):
        client, _ = admin_client
        Produto.objects.create(
            codigo="CAT-API-BORNE",
            descricao="B1",
            categoria=CategoriaProdutoNomeChoices.BORNE,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        Produto.objects.create(
            codigo="CAT-API-PLC",
            descricao="P1",
            categoria=CategoriaProdutoNomeChoices.PLC,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        url = reverse("catalogo-produtos-list")
        r = client.get(url, {"categoria": CategoriaProdutoNomeChoices.BORNE})
        assert r.status_code == 200
        body = r.json()
        assert "results" in body
        assert body["count"] >= 1
        for item in body["results"]:
            assert item["categoria"] == CategoriaProdutoNomeChoices.BORNE

    def test_list_search_so_ativos_limita_40(self, admin_client):
        client, _ = admin_client
        Produto.objects.create(
            codigo="CAT-SRC-ATIVO",
            descricao="Motor busca XYZ",
            categoria=CategoriaProdutoNomeChoices.CONTATORA,
            unidade_medida=UnidadeMedidaChoices.UN,
            ativo=True,
        )
        Produto.objects.create(
            codigo="CAT-SRC-INAT",
            descricao="Motor busca XYZ inativo",
            categoria=CategoriaProdutoNomeChoices.CONTATORA,
            unidade_medida=UnidadeMedidaChoices.UN,
            ativo=False,
        )
        url = reverse("catalogo-produtos-list")
        r = client.get(url, {"search": "XYZ"})
        assert r.status_code == 200
        body = r.json()
        codigos = {x["codigo"] for x in body["results"]}
        assert "CAT-SRC-ATIVO" in codigos
        assert "CAT-SRC-INAT" not in codigos

    def test_retrieve_detalhe(self, admin_client):
        client, _ = admin_client
        p = Produto.objects.create(
            codigo="CAT-GET-1",
            descricao="Detalhe",
            categoria=CategoriaProdutoNomeChoices.BORNE,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        url = reverse("catalogo-produtos-detail", kwargs={"pk": p.pk})
        r = client.get(url)
        assert r.status_code == 200
        assert r.json()["codigo"] == "CAT-GET-1"

    def test_create_retorna_detalhe_201(self, admin_client):
        client, _ = admin_client
        url = reverse("catalogo-produtos-list")
        payload = {
            "codigo": "CAT-POST-NEW",
            "descricao": "Novo via API",
            "categoria": CategoriaProdutoNomeChoices.BORNE,
            "unidade_medida": UnidadeMedidaChoices.UN,
            "valor_unitario": "0",
        }
        r = client.post(url, payload, format="json")
        assert r.status_code == 201
        body = r.json()
        assert body["codigo"] == "CAT-POST-NEW"
        assert Produto.objects.filter(codigo="CAT-POST-NEW").exists()

    def test_update_retorna_detalhe(self, admin_client):
        client, _ = admin_client
        p = Produto.objects.create(
            codigo="CAT-PATCH-1",
            descricao="Antes",
            categoria=CategoriaProdutoNomeChoices.BORNE,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        url = reverse("catalogo-produtos-detail", kwargs={"pk": p.pk})
        r = client.patch(
            url,
            {"descricao": "Depois", "fabricante": "Fab X"},
            format="json",
        )
        assert r.status_code == 200
        assert r.json()["descricao"] == "DEPOIS"
        p.refresh_from_db()
        assert p.descricao == "DEPOIS"
        assert p.fabricante == "FAB X"

    def test_list_sem_auth_401(self):
        url = reverse("catalogo-produtos-list")
        assert APIClient().get(url).status_code == 401

    def test_create_sem_campos_obrigatorios_400(self, admin_client):
        client, _ = admin_client
        url = reverse("catalogo-produtos-list")
        r = client.post(url, {}, format="json")
        assert r.status_code == 400
        body = r.json()
        assert "codigo" in body or "descricao" in body or "categoria" in body

    def test_create_categoria_invalida_400(self, admin_client):
        client, _ = admin_client
        url = reverse("catalogo-produtos-list")
        r = client.post(
            url,
            {
                "codigo": "CAT-INV-CAT",
                "descricao": "X",
                "categoria": "CATEGORIA_INEXISTENTE_XYZ",
                "unidade_medida": UnidadeMedidaChoices.UN,
            },
            format="json",
        )
        assert r.status_code == 400

    def test_create_codigo_duplicado_400(self, admin_client):
        client, _ = admin_client
        Produto.objects.create(
            codigo="CAT-DUP-1",
            descricao="Já existe",
            categoria=CategoriaProdutoNomeChoices.BORNE,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        url = reverse("catalogo-produtos-list")
        r = client.post(
            url,
            {
                "codigo": "CAT-DUP-1",
                "descricao": "Outro",
                "categoria": CategoriaProdutoNomeChoices.BORNE,
                "unidade_medida": UnidadeMedidaChoices.UN,
            },
            format="json",
        )
        assert r.status_code == 400

    def test_create_sem_permissao_edicao_403(
        self,
        usuario_material_somente_leitura_client,
    ):
        client, _ = usuario_material_somente_leitura_client
        url = reverse("catalogo-produtos-list")
        r = client.post(
            url,
            {
                "codigo": "CAT-403-1",
                "descricao": "N",
                "categoria": CategoriaProdutoNomeChoices.BORNE,
                "unidade_medida": UnidadeMedidaChoices.UN,
            },
            format="json",
        )
        assert r.status_code == 403

    def test_patch_sem_permissao_edicao_403(
        self,
        usuario_material_somente_leitura_client,
    ):
        client, _ = usuario_material_somente_leitura_client
        p = Produto.objects.create(
            codigo="CAT-403-PATCH",
            descricao="Antes",
            categoria=CategoriaProdutoNomeChoices.BORNE,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        url = reverse("catalogo-produtos-detail", kwargs={"pk": p.pk})
        r = client.patch(url, {"descricao": "Depois"}, format="json")
        assert r.status_code == 403

    def test_create_contatora_sem_corrente_ac3_e_ac1_retorna_400(self, admin_client):
        client, _ = admin_client
        url = reverse("catalogo-produtos-list")
        r = client.post(
            url,
            {
                "codigo": "CAT-CTR-INV",
                "descricao": "Contatora inválida",
                "categoria": CategoriaProdutoNomeChoices.CONTATORA,
                "unidade_medida": UnidadeMedidaChoices.UN,
                "especificacao_contatora": {
                    "tensao_bobina_v": 24,
                    "tipo_corrente_bobina": "CC",
                    "modo_montagem": "TRILHO_DIN",
                },
            },
            format="json",
        )
        assert r.status_code == 400
