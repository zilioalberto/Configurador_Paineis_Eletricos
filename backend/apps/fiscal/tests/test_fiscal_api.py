from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework import status
from rest_framework.test import APIClient

from apps.catalogo.models import Produto
from apps.fiscal.models import ItemFiscalProduto
from core.choices.produtos import CategoriaProdutoNomeChoices, UnidadeMedidaChoices
from core.choices.usuarios import TipoUsuarioChoices
from core.permissions import PermissionKeys

User = get_user_model()


class FiscalItensFiscaisApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.user = User.objects.create_user(
            email="fiscal_api@test.com",
            password="pass12345",
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.ADMIN,
            first_name="Fiscal",
            last_name="API",
        )
        self.client.force_authenticate(self.user)

        self.produto = Produto.objects.create(
            codigo="FIS-001",
            descricao="Produto fiscal teste",
            categoria=CategoriaProdutoNomeChoices.PLC,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        self.item = ItemFiscalProduto.objects.create(
            produto=self.produto,
            ordem=0,
            rotulo="ICMS",
            cfop="5102",
            origem_mercadoria="0",
            cst_icms="00",
            n_item_nfe=1,
        )

    def test_list_requires_permission(self):
        sem_material = User.objects.create_user(
            email="fiscal_sem_material@test.com",
            password="pass12345",
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.USUARIO,
            permissoes_negadas=[PermissionKeys.MATERIAL_VISUALIZAR_LISTA],
        )
        self.client.force_authenticate(sem_material)
        resp = self.client.get("/api/v1/fiscal/itens-fiscais/")
        self.assertEqual(resp.status_code, status.HTTP_403_FORBIDDEN)
        self.client.force_authenticate(self.user)

    def test_list_returns_item(self):
        resp = self.client.get("/api/v1/fiscal/itens-fiscais/")
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        self.assertIn("results", resp.data)
        self.assertGreaterEqual(len(resp.data["results"]), 1)
        row = next(r for r in resp.data["results"] if r["id"] == str(self.item.id))
        self.assertEqual(row["produto_codigo"], "FIS-001")
        self.assertEqual(row["cfop"], "5102")

    def test_search_by_codigo(self):
        resp = self.client.get("/api/v1/fiscal/itens-fiscais/", {"search": "FIS-001"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {r["id"] for r in resp.data["results"]}
        self.assertIn(str(self.item.id), ids)

    def test_search_by_descricao_produto(self):
        resp = self.client.get("/api/v1/fiscal/itens-fiscais/", {"search": "fiscal teste"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {r["id"] for r in resp.data["results"]}
        self.assertIn(str(self.item.id), ids)

    def test_search_nao_filtra_por_cfop(self):
        resp = self.client.get("/api/v1/fiscal/itens-fiscais/", {"search": "5102"})
        self.assertEqual(resp.status_code, status.HTTP_200_OK)
        ids = {r["id"] for r in resp.data["results"]}
        self.assertNotIn(str(self.item.id), ids)
