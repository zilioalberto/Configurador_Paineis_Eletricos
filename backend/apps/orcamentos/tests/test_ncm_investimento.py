import pytest

from apps.orcamentos.constants import NCM_INVESTIMENTO_PAINEL_PADRAO
from apps.orcamentos.models import (
    Orcamento,
    PerfilOfertaChoices,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from apps.orcamentos.services.investimento_oferta import montar_investimento_oferta
from apps.orcamentos.services.ncm_investimento import normalizar_ncm_investimento
from decimal import Decimal

from apps.orcamentos.models import OrcamentoItem


def test_normalizar_ncm_usa_padrao_painel():
    assert normalizar_ncm_investimento("") == NCM_INVESTIMENTO_PAINEL_PADRAO
    assert normalizar_ncm_investimento("85.37.1090") == "85371090"


@pytest.mark.django_db
def test_investimento_solucao_completa_usa_ncm_manual(user_admin):
    orc = Orcamento.objects.create(
        codigo_base="O-NCM",
        titulo="Painel custom",
        perfil_oferta=PerfilOfertaChoices.SOLUCAO_COMPLETA,
        ncm_investimento="12345678",
        status=StatusOrcamentoChoices.RASCUNHO,
        criado_por=user_admin,
    )
    OrcamentoItem.objects.create(
        orcamento=orc,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Item",
        quantidade=Decimal("1"),
        preco_unitario=Decimal("100"),
    )
    bloco = montar_investimento_oferta(orc, list(orc.itens.all()))
    assert bloco["itens"][0]["ncm"] == "12345678"
