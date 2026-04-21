"""Testes HTTP das views de composição (cobertura Sonar para código novo na API)."""

from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from cargas.models import Carga
from catalogo.models import Produto
from composicao_painel.models import ComposicaoItem, SugestaoItem
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    StatusProjetoChoices,
    TensaoChoices,
)
from core.choices.cargas import TipoCargaChoices
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
    raw = "secret-test-pass-12345"
    user = User.objects.create_user(
        email="composicao-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
        first_name="Admin",
        last_name="Test",
    )
    return _auth_client(user.email, raw), user


@pytest.fixture
def usuario_sem_permissao_almox():
    raw = "secret-usuario-12345"
    user = User.objects.create_user(
        email="composicao-user@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
class TestComposicaoProjetoSnapshotView:
    def test_get_snapshot_estrutura(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="P", codigo="09001-26", tensao_nominal=TensaoChoices.V380)
        url = reverse("composicao-projeto-snapshot", kwargs={"projeto_id": projeto.id})
        response = client.get(url)
        assert response.status_code == 200
        body = response.json()
        assert body["projeto"] == str(projeto.id)
        assert "totais" in body
        assert body["totais"]["sugestoes"] == 0
        assert isinstance(body["sugestoes"], list)

    def test_get_nao_autenticado_401(self, criar_projeto):
        projeto = criar_projeto(nome="P2", codigo="09002-26", tensao_nominal=TensaoChoices.V380)
        url = reverse("composicao-projeto-snapshot", kwargs={"projeto_id": projeto.id})
        response = APIClient().get(url)
        assert response.status_code == 401

    def test_get_sem_permissao_funcional_403(self, usuario_sem_permissao_almox, criar_projeto):
        client, _ = usuario_sem_permissao_almox
        projeto = criar_projeto(nome="P3", codigo="09003-26", tensao_nominal=TensaoChoices.V380)
        url = reverse("composicao-projeto-snapshot", kwargs={"projeto_id": projeto.id})
        response = client.get(url)
        assert response.status_code == 403


@pytest.mark.django_db
class TestComposicaoGerarSugestoesView:
    @patch("composicao_painel.api.views.gerar_sugestoes_painel")
    def test_post_gera_e_retorna_snapshot(self, mock_gerar, admin_client, criar_projeto):
        mock_gerar.return_value = {
            "total_sugestoes": 1,
            "erros": [],
            "sugestoes_descartadas_aprovadas": 0,
        }
        client, _ = admin_client
        projeto = criar_projeto(nome="G", codigo="09101-26", tensao_nominal=TensaoChoices.V380)
        url = reverse("composicao-projeto-gerar-sugestoes", kwargs={"projeto_id": projeto.id})
        response = client.post(url, {"limpar_antes": False}, format="json")
        assert response.status_code == 200
        body = response.json()
        assert body["geracao"]["total_sugestoes_retornadas"] == 1
        mock_gerar.assert_called_once()
        _, kwargs = mock_gerar.call_args
        assert kwargs["limpar_antes"] is False

    def test_post_projeto_finalizado_400(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="GF", codigo="09102-26", tensao_nominal=TensaoChoices.V380)
        projeto.status = StatusProjetoChoices.FINALIZADO
        projeto.save(update_fields=["status"])
        url = reverse("composicao-projeto-gerar-sugestoes", kwargs={"projeto_id": projeto.id})
        response = client.post(url, {}, format="json")
        assert response.status_code == 400
        assert "detail" in response.json()


@pytest.mark.django_db
class TestComposicaoReavaliarPendenciasView:
    @patch("composicao_painel.api.views.reavaliar_pendencias_projeto")
    def test_post_reavalia(self, mock_reav, admin_client, criar_projeto):
        mock_reav.return_value = {
            "projeto_id": None,
            "categorias_reavaliadas": ["CONTATORA"],
            "categorias_nao_mapeadas": [],
        }
        client, _ = admin_client
        projeto = criar_projeto(nome="R", codigo="09201-26", tensao_nominal=TensaoChoices.V380)
        url = reverse("composicao-projeto-reavaliar-pendencias", kwargs={"projeto_id": projeto.id})
        response = client.post(url, {}, format="json")
        assert response.status_code == 200
        body = response.json()
        assert body["reavaliacao"]["categorias_reavaliadas"] == ["CONTATORA"]
        mock_reav.assert_called_once()


@pytest.mark.django_db
class TestComposicaoExports:
    def test_export_xlsx_anexo(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="X", codigo="09301-26", tensao_nominal=TensaoChoices.V380)
        url = reverse("composicao-projeto-export-xlsx", kwargs={"projeto_id": projeto.id})
        response = client.get(url)
        assert response.status_code == 200
        assert "spreadsheetml" in response["Content-Type"]
        assert "attachment" in response["Content-Disposition"]

    def test_export_pdf_anexo(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="PDF", codigo="09302-26", tensao_nominal=TensaoChoices.V380)
        url = reverse("composicao-projeto-export-pdf", kwargs={"projeto_id": projeto.id})
        response = client.get(url)
        assert response.status_code == 200
        assert response["Content-Type"] == "application/pdf"
        assert "attachment" in response["Content-Disposition"]


@pytest.mark.django_db
class TestSugestaoAlternativasView:
    @patch("composicao_painel.api.views.listar_alternativas_para_sugestao", return_value=[])
    def test_get_alternativas(self, _mock_lista, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="Alt", codigo="09401-26", tensao_nominal=TensaoChoices.V380)
        produto = Produto.objects.create(
            codigo="ALT-P1",
            descricao="P",
            categoria=CategoriaProdutoNomeChoices.CONTATORA,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        sugestao = SugestaoItem.objects.create(
            projeto=projeto,
            carga=None,
            produto=produto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
            quantidade=Decimal("1"),
            ordem=1,
        )
        url = reverse("composicao-sugestao-alternativas", kwargs={"sugestao_id": sugestao.id})
        response = client.get(url)
        assert response.status_code == 200
        assert response.json()["alternativas"] == []


@pytest.mark.django_db
class TestSugestaoAprovarView:
    def test_aprova_sem_substituto(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="Ap", codigo="09501-26", tensao_nominal=TensaoChoices.V380)
        produto = Produto.objects.create(
            codigo="APR-P1",
            descricao="Prod",
            categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        carga = Carga.objects.create(
            projeto=projeto,
            tag="M1",
            descricao="Motor",
            tipo=TipoCargaChoices.MOTOR,
        )
        sugestao = SugestaoItem.objects.create(
            projeto=projeto,
            carga=carga,
            produto=produto,
            parte_painel=PartesPainelChoices.PROTECAO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
            quantidade=Decimal("1"),
            ordem=10,
        )
        url = reverse("composicao-sugestao-aprovar", kwargs={"sugestao_id": sugestao.id})
        response = client.post(url, {}, format="json")
        assert response.status_code == 200
        data = response.json()
        assert "composicao_item" in data
        assert "snapshot" in data
        assert not SugestaoItem.objects.filter(pk=sugestao.id).exists()
        assert ComposicaoItem.objects.filter(projeto=projeto, carga=carga).exists()

    def test_aprova_com_substituto_mesma_categoria(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="Ap2", codigo="09502-26", tensao_nominal=TensaoChoices.V380)
        p1 = Produto.objects.create(
            codigo="APR-S1",
            descricao="A",
            categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        p2 = Produto.objects.create(
            codigo="APR-S2",
            descricao="B",
            categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        sugestao = SugestaoItem.objects.create(
            projeto=projeto,
            carga=None,
            produto=p1,
            parte_painel=PartesPainelChoices.SECCIONAMENTO,
            categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
            quantidade=Decimal("2"),
            ordem=5,
        )
        url = reverse("composicao-sugestao-aprovar", kwargs={"sugestao_id": sugestao.id})
        response = client.post(url, {"produto_id": str(p2.id)}, format="json")
        assert response.status_code == 200
        item_id = response.json()["composicao_item"]["id"]
        item = ComposicaoItem.objects.get(pk=item_id)
        assert item.produto_id == p2.id


@pytest.mark.django_db
class TestInclusaoManual:
    def test_cria_e_remove(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="Inc", codigo="09601-26", tensao_nominal=TensaoChoices.V380)
        produto = Produto.objects.create(
            codigo="INC-P1",
            descricao="Cat",
            categoria=CategoriaProdutoNomeChoices.BORNE,
            unidade_medida=UnidadeMedidaChoices.UN,
            ativo=True,
        )
        url_c = reverse("composicao-projeto-inclusoes-manuais", kwargs={"projeto_id": projeto.id})
        response = client.post(
            url_c,
            {"produto_id": str(produto.id), "quantidade": "3", "observacoes": "x"},
            format="json",
        )
        assert response.status_code == 201
        inc_id = response.json()["inclusao_manual"]["id"]

        url_d = reverse("composicao-inclusao-manual-detail", kwargs={"inclusao_id": inc_id})
        response_del = client.delete(url_d)
        assert response_del.status_code == 200
        assert "snapshot" in response_del.json()

    def test_produto_inativo_400(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="Ini", codigo="09602-26", tensao_nominal=TensaoChoices.V380)
        produto = Produto.objects.create(
            codigo="INC-INAT",
            descricao="Inativo",
            categoria=CategoriaProdutoNomeChoices.BORNE,
            unidade_medida=UnidadeMedidaChoices.UN,
            ativo=False,
        )
        url = reverse("composicao-projeto-inclusoes-manuais", kwargs={"projeto_id": projeto.id})
        response = client.post(url, {"produto_id": str(produto.id)}, format="json")
        assert response.status_code == 400


@pytest.mark.django_db
class TestComposicaoItemReabrirView:
    def test_reabrir_item_aprovado(self, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="Re", codigo="09701-26", tensao_nominal=TensaoChoices.V380)
        produto = Produto.objects.create(
            codigo="RE-P1",
            descricao="P",
            categoria=CategoriaProdutoNomeChoices.CONTATORA,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        item = ComposicaoItem.objects.create(
            projeto=projeto,
            carga=None,
            produto=produto,
            parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
            categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
            quantidade=Decimal("1"),
            ordem=1,
        )
        url = reverse("composicao-item-reabrir", kwargs={"composicao_item_id": item.id})
        response = client.post(url, {}, format="json")
        assert response.status_code == 200
        data = response.json()
        assert "sugestao_item" in data
        assert not ComposicaoItem.objects.filter(pk=item.id).exists()
