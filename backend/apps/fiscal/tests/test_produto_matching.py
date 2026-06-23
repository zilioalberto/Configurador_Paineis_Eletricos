"""Testes do matching em cascata item NF-e → produto do catálogo."""
import pytest

from apps.catalogo.models import Produto
from apps.fiscal.models import ProdutoFornecedorXRef
from apps.fiscal.services.produto_matching import encontrar_produto
from core.choices.produtos import CategoriaProdutoNomeChoices, UnidadeMedidaChoices


def _produto(**kwargs):
    base = {
        "codigo": "INT-001",
        "descricao": "Contatora tripolar 25A 220V",
        "categoria": CategoriaProdutoNomeChoices.CONTATORA,
        "unidade_medida": UnidadeMedidaChoices.UN,
        "custo_referencia": "100.00",
    }
    base.update(kwargs)
    produto = Produto(**base)
    produto.full_clean()
    produto.save()
    return produto


@pytest.mark.django_db
class TestEncontrarProduto:
    def test_match_por_gtin(self):
        prod = _produto(gtin="7891234567895")
        resultado = encontrar_produto(gtin="7891234567895", codigo_fornecedor="OUTRO")
        assert resultado.produto == prod
        assert resultado.metodo == "GTIN"
        assert resultado.requer_confirmacao is False

    def test_match_por_depara(self):
        prod = _produto()
        ProdutoFornecedorXRef.objects.create(
            produto=prod,
            cnpj_fornecedor="12345678000199",
            codigo_fornecedor="FORN-XYZ",
        )
        resultado = encontrar_produto(
            cnpj_fornecedor="12345678000199",
            codigo_fornecedor="FORN-XYZ",
        )
        assert resultado.produto == prod
        assert resultado.metodo == "DEPARA"

    def test_match_por_codigo(self):
        prod = _produto(codigo="INT-001")
        resultado = encontrar_produto(codigo_fornecedor="int-001")
        assert resultado.produto == prod
        assert resultado.metodo == "CODIGO"

    def test_sugestao_por_similaridade(self):
        _produto(codigo="INT-001", descricao="Contatora tripolar 25A 220V", ncm="85364900")
        resultado = encontrar_produto(
            codigo_fornecedor="ZZZ-999",
            ncm="85364900",
            descricao="Contatora tripolar 25 A 220 V",
        )
        assert resultado.produto is None
        assert resultado.metodo == "SIMILARIDADE"
        assert resultado.requer_confirmacao is True
        assert resultado.sugestoes
        assert resultado.sugestoes[0].codigo == "INT-001"

    def test_sem_match(self):
        _produto(codigo="INT-001", descricao="Contatora tripolar", ncm="85364900")
        resultado = encontrar_produto(
            codigo_fornecedor="NADA",
            ncm="11111111",
            descricao="Parafuso sextavado inox",
        )
        assert resultado.produto is None
        assert resultado.metodo == "NENHUM"
