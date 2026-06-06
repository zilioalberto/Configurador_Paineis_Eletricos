"""Descrição editável do investimento (solução completa)."""
import pytest
from decimal import Decimal

from apps.cadastros.models import ParceiroComercial
from apps.orcamentos.models import (
    Orcamento,
    OrcamentoItem,
    PerfilOfertaChoices,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from apps.orcamentos.services.investimento_oferta import montar_investimento_oferta


@pytest.mark.django_db
def test_investimento_solucao_completa_usa_descricao_customizada():
    cliente = ParceiroComercial.objects.create(
        documento="12345678000199",
        razao_social="Cliente SC LTDA",
        eh_cliente=True,
    )
    orc = Orcamento.objects.create(
        codigo_base="O-INV-DESC",
        titulo="Painel 01",
        cliente=cliente,
        perfil_oferta=PerfilOfertaChoices.SOLUCAO_COMPLETA,
        status=StatusOrcamentoChoices.RASCUNHO,
        investimento_descricao="Fornecimento de painel elétrico completo",
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        ordem=0,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Item interno",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("1000"),
        preco_unitario=Decimal("1200"),
    )

    inv = montar_investimento_oferta(orc, list(orc.itens.all()))

    assert inv["modo"] == "CONSOLIDADO"
    assert inv["itens"][0]["descricao"] == "Fornecimento de painel elétrico completo"
