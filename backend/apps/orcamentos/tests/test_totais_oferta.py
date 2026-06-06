from decimal import Decimal

import pytest

from apps.orcamentos.models import (
    Orcamento,
    OrcamentoItem,
    PerfilOfertaChoices,
    TipoItemOrcamentoChoices,
)
from apps.orcamentos.services.totais_oferta import calcular_resumo_financeiro_oferta


@pytest.mark.django_db
def test_resumo_sem_desconto_mantem_total(user_admin, cliente_com_contato):
    user, _raw = user_admin
    cliente, _contato = cliente_com_contato
    orc = Orcamento.objects.create(
        titulo="Teste",
        cliente=cliente,
        criado_por=user,
    )
    item = OrcamentoItem.objects.create(
        orcamento=orc,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Produto",
        quantidade=Decimal("2"),
        custo_unitario=Decimal("100"),
        margem_percentual=Decimal("10"),
        preco_unitario=Decimal("110"),
        aliquota_ipi=Decimal("5"),
    )
    resumo = calcular_resumo_financeiro_oferta(
        [item],
        desconto_ativo=False,
        desconto_percentual=0,
    )
    assert resumo["total"] == "220"
    assert resumo["desconto_ativo"] is False


@pytest.mark.django_db
def test_resumo_com_desconto_total_liquido_sem_linha_impostos(user_admin, cliente_com_contato):
    user, _raw = user_admin
    cliente, _contato = cliente_com_contato
    orc = Orcamento.objects.create(
        titulo="Teste desc",
        cliente=cliente,
        criado_por=user,
        desconto_comercial_ativo=True,
        desconto_percentual=Decimal("5"),
    )
    item = OrcamentoItem.objects.create(
        orcamento=orc,
        tipo=TipoItemOrcamentoChoices.PRODUTO,
        descricao="Produto",
        quantidade=Decimal("1"),
        custo_unitario=Decimal("1000"),
        margem_percentual=Decimal("0"),
        preco_unitario=Decimal("1100"),
        aliquota_ipi=Decimal("10"),
    )
    resumo = calcular_resumo_financeiro_oferta(
        [item],
        desconto_ativo=True,
        desconto_percentual=Decimal("5"),
    )
    assert resumo["desconto_ativo"] is True
    assert resumo["desconto_valor"] == "55"
    assert resumo["impostos_valor"] == "0"
    assert resumo["total"] == "1045"
