"""Testes da ponte NF-e recebida → catálogo (importação + rastreabilidade + de-para)."""
import pytest

from apps.catalogo.models import Produto
from apps.fiscal.models import ProdutoFornecedorXRef
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.services.ponte_catalogo import (
    importar_nfe_para_catalogo,
    preview_catalogo_nfe,
    vincular_item_a_produto,
)
from apps.fiscal.tests.fixtures_nfe_xml import XML_NFE_PROC
from core.choices.produtos import CategoriaProdutoNomeChoices, UnidadeMedidaChoices


@pytest.mark.django_db
@pytest.mark.usefixtures("fiscal_cnpj_recebidas_settings")
class TestPonteCatalogo:
    def test_preview_inclui_match(self):
        doc = importar_xml_nfe(xml=XML_NFE_PROC)["documento"]
        preview = preview_catalogo_nfe(doc)
        itens = preview["snapshot"]["itens"]
        assert itens
        assert "match" in itens[0]
        assert itens[0]["match"]["metodo"] in {
            "GTIN",
            "DEPARA",
            "CODIGO",
            "SIMILARIDADE",
            "NENHUM",
        }

    def test_importar_cria_produto_vincula_item_e_depara(self):
        doc = importar_xml_nfe(xml=XML_NFE_PROC)["documento"]
        resultado, vinculados = importar_nfe_para_catalogo(
            doc,
            criar_fornecedor=False,
            categoria_padrao=CategoriaProdutoNomeChoices.CONTATORA,
            itens=[{"n_item": 1, "importar": True}],
        )
        assert "FAB-001" in resultado.produtos_criados
        assert vinculados == 1

        item = doc.itens.first()
        item.refresh_from_db()
        assert item.produto is not None
        assert item.importado_para_produto is True

        xref = ProdutoFornecedorXRef.objects.get(
            cnpj_fornecedor=doc.cnpj_emitente,
            codigo_fornecedor="FAB-001",
        )
        assert xref.produto_id == item.produto_id

    def test_vincular_item_manual(self):
        doc = importar_xml_nfe(xml=XML_NFE_PROC)["documento"]
        produto = Produto(
            codigo="MANUAL-1",
            descricao="Produto manual",
            categoria=CategoriaProdutoNomeChoices.CONTATORA,
            unidade_medida=UnidadeMedidaChoices.UN,
            custo_referencia="50.00",
        )
        produto.full_clean()
        produto.save()

        item = doc.itens.first()
        vincular_item_a_produto(item, produto)
        item.refresh_from_db()
        assert item.produto_id == produto.id
        assert ProdutoFornecedorXRef.objects.filter(
            cnpj_fornecedor=doc.cnpj_emitente,
            codigo_fornecedor=item.codigo_fornecedor,
        ).exists()
