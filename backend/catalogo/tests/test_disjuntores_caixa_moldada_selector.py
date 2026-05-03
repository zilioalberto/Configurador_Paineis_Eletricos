from decimal import Decimal

import pytest

from catalogo.models import EspecificacaoDisjuntorCaixaMoldada, Produto
from catalogo.selectors.disjuntores_caixa_moldada import selecionar_disjuntores_caixa_moldada
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    ConfiguracaoDisparadorDisjuntorCMChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
    UnidadeMedidaChoices,
)


@pytest.mark.django_db
def test_selecionar_disjuntores_caixa_moldada_corrente_none_retorna_vazio():
    assert not selecionar_disjuntores_caixa_moldada(None).exists()


@pytest.mark.django_db
def test_selecionar_disjuntores_caixa_moldada_sem_produtos_retorna_vazio():
    assert not selecionar_disjuntores_caixa_moldada(10).exists()


@pytest.mark.django_db
def test_selecionar_disjuntores_caixa_moldada_niveis_zero_nao_aplica_filtro_por_niveis():
    qs = selecionar_disjuntores_caixa_moldada(15, niveis=0)
    sql = str(qs.query).lower()
    assert "corrente_nominal_a" in sql
    assert "descricao" in sql


@pytest.mark.django_db
def test_selecionar_disjuntores_caixa_moldada_niveis_positivos_sem_produtos_retorna_vazio():
    """Ramo `niveis > 0` com lista de correntes vazia (cobre fatia por níveis)."""
    assert not selecionar_disjuntores_caixa_moldada(100, niveis=2).exists()


@pytest.mark.django_db
def test_selecionar_disjuntores_caixa_moldada_filtra_modo_montagem():
    """Cobre ramo `if modo_montagem:` no selector."""
    prod_a = Produto.objects.create(
        codigo="CM-A",
        descricao="A",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoDisjuntorCaixaMoldada.objects.create(
        produto=prod_a,
        corrente_nominal_a=Decimal("100"),
        numero_polos=NumeroPolosChoices.P3,
        configuracao_disparador=(
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_IR_II_FIXOS
        ),
        capacidade_interrupcao_380v_ka=Decimal("50"),
        modo_montagem=ModoMontagemChoices.PLACA,
    )
    prod_b = Produto.objects.create(
        codigo="CM-B",
        descricao="B",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoDisjuntorCaixaMoldada.objects.create(
        produto=prod_b,
        corrente_nominal_a=Decimal("100"),
        numero_polos=NumeroPolosChoices.P3,
        configuracao_disparador=(
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_IR_II_FIXOS
        ),
        capacidade_interrupcao_380v_ka=Decimal("50"),
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    qs = selecionar_disjuntores_caixa_moldada(
        50,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    assert list(qs.values_list("pk", flat=True)) == [prod_b.pk]
