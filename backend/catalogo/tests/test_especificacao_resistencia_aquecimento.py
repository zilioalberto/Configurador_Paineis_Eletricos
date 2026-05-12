from decimal import Decimal

import pytest

from catalogo.models import Produto
from catalogo.models.especificacao_resistencia_aquecimento import (
    EspecificacaoResistenciaAquecimento,
)
from core.choices.eletrica import TensaoChoices
from core.choices.produtos import TipoResistenciaAquecimentoChoices, UnidadeMedidaChoices


@pytest.mark.django_db
def test_especificacao_resistencia_aquecimento_str():
    # Categoria histórica (tabela de especificação ainda existe; enum atual não lista).
    produto = Produto.objects.create(
        codigo="RAQ-01",
        descricao="Resistência teste",
        categoria="RESISTENCIA_AQUECIMENTO",
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    spec = EspecificacaoResistenciaAquecimento.objects.create(
        produto=produto,
        tipo_resistencia=TipoResistenciaAquecimentoChoices.CONVENCIONAL,
        potencia_w=Decimal("1500.00"),
        tensao_alimentacao_v=TensaoChoices.V220,
    )
    assert "1500" in str(spec)
    assert "220" in str(spec)
