"""Integração real do seletor de minidisjuntor geral (sem mock)."""

from decimal import Decimal

import pytest

from apps.catalogo.models import EspecificacaoMiniDisjuntor, Produto
from apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral import (
    _selecionar_minidisjuntor_geral,
)
from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    TensaoChoices,
    TipoDisjuntorGeralChoices,
)
from core.choices.produtos import (
    CurvaDisparoMiniDisjuntorChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
    UnidadeMedidaChoices,
)


@pytest.mark.django_db
def test_selecionar_minidisjuntor_geral_encontra_in_acima_da_referencia(criar_projeto):
    projeto = criar_projeto(
        nome="SelDG",
        codigo="17001-26",
        tensao_nominal=TensaoChoices.V380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.MINIDISJUNTOR,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("42"),
    )

    p40 = Produto.objects.create(
        codigo="MD-40",
        descricao="Mini 40A",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p40,
        corrente_nominal_a=Decimal("40"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    p50 = Produto.objects.create(
        codigo="MD-50",
        descricao="Mini 50A",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p50,
        corrente_nominal_a=Decimal("50"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )

    opcoes = list(_selecionar_minidisjuntor_geral(projeto, Decimal("42")))
    assert [p.codigo for p in opcoes] == ["MD-50"]
