import pytest

from catalogo.selectors._base import filtrar_produtos_especificacao, related_name_para_categoria
from core.choices.produtos import CategoriaProdutoNomeChoices


@pytest.mark.django_db
def test_related_name_para_categoria_borne():
    assert related_name_para_categoria(CategoriaProdutoNomeChoices.BORNE) == "especificacao_borne"


@pytest.mark.django_db
def test_filtrar_produtos_especificacao_executa_query_borne():
    qs = filtrar_produtos_especificacao(
        CategoriaProdutoNomeChoices.BORNE,
        modo_montagem="TRILHO_DIN",
    )
    assert list(qs) == []
