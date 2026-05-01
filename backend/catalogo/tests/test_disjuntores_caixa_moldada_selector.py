import pytest

from catalogo.selectors.disjuntores_caixa_moldada import selecionar_disjuntores_caixa_moldada


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
