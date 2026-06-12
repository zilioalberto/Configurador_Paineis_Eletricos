import pytest

from apps.cadastros.models import ParceiroComercial
from core.choices.produtos import CategoriaProdutoNomeChoices, UnidadeMedidaChoices
from apps.catalogo.models import Produto
from apps.catalogo.utils.fabricante_produto import nome_fabricante_produto


@pytest.mark.django_db
class TestNomeFabricanteProduto:
    def test_retorna_vazio_sem_produto(self):
        assert nome_fabricante_produto(None) == ""

    def test_retorna_vazio_sem_fabricante(self):
        produto = Produto.objects.create(
            codigo="P-SEM-FAB",
            descricao="Sem fabricante",
            categoria=CategoriaProdutoNomeChoices.OUTROS,
            unidade_medida=UnidadeMedidaChoices.UN,
        )
        assert nome_fabricante_produto(produto) == ""

    def test_retorna_nome_fantasia_do_parceiro(self):
        parceiro = ParceiroComercial.objects.create(
            documento="11222333000199",
            razao_social="Fabricante SA",
            nome_fantasia="Fab Fantasia",
            eh_fornecedor=True,
        )
        produto = Produto.objects.create(
            codigo="P-COM-FAB",
            descricao="Com fabricante",
            categoria=CategoriaProdutoNomeChoices.OUTROS,
            unidade_medida=UnidadeMedidaChoices.UN,
            fabricante_parceiro=parceiro,
        )
        assert nome_fabricante_produto(produto) == "Fab Fantasia"

    def test_fallback_razao_social(self):
        parceiro = ParceiroComercial.objects.create(
            documento="22333444000188",
            razao_social="Razão Social Ltda",
            nome_fantasia="",
            eh_fornecedor=True,
        )
        produto = Produto.objects.create(
            codigo="P-RAZAO",
            descricao="Fabricante só razão",
            categoria=CategoriaProdutoNomeChoices.OUTROS,
            unidade_medida=UnidadeMedidaChoices.UN,
            fabricante_parceiro=parceiro,
        )
        assert nome_fabricante_produto(produto) == "Razão Social Ltda"
