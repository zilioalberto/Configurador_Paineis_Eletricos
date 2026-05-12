from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from catalogo.models import Produto
from catalogo.models.especificacao_filtro_ar import EspecificacaoFiltroAr
from core.choices.produtos import TipoFiltroArChoices, UnidadeMedidaChoices


@pytest.mark.django_db
def test_especificacao_filtro_ar_str_e_clean():
    produto = Produto.objects.create(
        codigo="FA-01",
        descricao="Filtro teste",
        categoria="FILTRO_AR",
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    spec = EspecificacaoFiltroAr.objects.create(
        produto=produto,
        tipo_filtro=TipoFiltroArChoices.ENTRADA_AR,
        vazao_nominal_m3_h=Decimal("100.00"),
    )
    assert produto.codigo in str(spec)
    assert "ENTRADA_AR" in str(spec)

    spec.vazao_nominal_m3_h = Decimal("0")
    with pytest.raises(ValidationError):
        spec.full_clean()
