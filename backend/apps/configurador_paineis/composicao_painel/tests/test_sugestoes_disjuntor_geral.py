"""Cobre `disjuntor_geral.py`."""

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from apps.catalogo.models import Produto
from apps.configurador_paineis.composicao_painel.models import PendenciaItem
from apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral import (
    _nucleo_gerar_disjuntor_geral,
    gerar_sugestao_disjuntor_geral,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    TensaoChoices,
    TipoDisjuntorGeralChoices,
)
from core.choices.produtos import UnidadeMedidaChoices
from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento


def _referencia(corrente: str, *, fases=None):
    fases = fases or [Decimal(corrente)]
    return SimpleNamespace(
        correntes_por_fase_a=fases,
        indice_fase_mais_carregada=0,
        corrente_fase_mais_carregada_a=Decimal(corrente),
        fator_demanda=Decimal("1.00"),
        corrente_referencia_a=Decimal(corrente),
    )


@pytest.mark.django_db
def test_nucleo_sem_disjuntor_geral_retorna_none(criar_projeto):
    projeto = criar_projeto(
        nome="Dg0",
        codigo="16000-26",
        tensao_nominal=TensaoChoices.V380,
        possui_disjuntor_geral=False,
    )
    assert _nucleo_gerar_disjuntor_geral(projeto) is None


@pytest.mark.django_db
def test_nucleo_disjuntor_cm_sem_produto_cria_pendencia(criar_projeto):
    projeto = criar_projeto(
        nome="Dg1",
        codigo="16001-26",
        tensao_nominal=TensaoChoices.V380,
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("120"),
    )
    with (
        patch(
            "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral._obter_referencia_corrente_entrada",
            return_value=_referencia("120"),
        ),
        patch(
            "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral.selecionar_disjuntores_caixa_moldada",
            return_value=Produto.objects.none(),
        ),
    ):
        assert _nucleo_gerar_disjuntor_geral(projeto) is None
    p = PendenciaItem.objects.get(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    assert "caixa moldada" in p.descricao.lower()
    assert "120" in p.descricao


@pytest.mark.django_db
def test_nucleo_disjuntor_cm_com_produto_cria_sugestao(criar_projeto):
    projeto = criar_projeto(
        nome="Dg2",
        codigo="16002-26",
        tensao_nominal=TensaoChoices.V380,
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("30"),
    )
    produto = Produto.objects.create(
        codigo="DG-P1",
        descricao="DCM geral",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with (
        patch(
            "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral._obter_referencia_corrente_entrada",
            return_value=_referencia("30"),
        ),
        patch(
            "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral.selecionar_disjuntores_caixa_moldada",
            return_value=Produto.objects.filter(pk=produto.pk),
        ),
    ):
        sug = _nucleo_gerar_disjuntor_geral(projeto)
    assert sug is not None
    assert sug.produto_id == produto.id
    assert sug.parte_painel == PartesPainelChoices.PROTECAO_GERAL
    assert sug.corrente_referencia_a == Decimal("30")
    assert "fase mais carregada" in sug.memoria_calculo.lower()


@pytest.mark.django_db
def test_nucleo_minidisjuntor_com_produto_cria_sugestao(criar_projeto):
    projeto = criar_projeto(
        nome="Dg3",
        codigo="16003-26",
        tensao_nominal=TensaoChoices.V380,
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.MINIDISJUNTOR,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("25"),
    )
    produto = Produto.objects.create(
        codigo="DG-P2",
        descricao="MD geral",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with (
        patch(
            "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral._obter_referencia_corrente_entrada",
            return_value=_referencia("25"),
        ),
        patch(
            "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral._selecionar_minidisjuntor_geral",
            return_value=Produto.objects.filter(pk=produto.pk),
        ),
    ):
        sug = _nucleo_gerar_disjuntor_geral(projeto)
    assert sug is not None
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.MINIDISJUNTOR


@pytest.mark.django_db
def test_nucleo_usa_fase_mais_carregada_exemplo_42a(criar_projeto):
    projeto = criar_projeto(
        nome="Dg5",
        codigo="16005-26",
        tensao_nominal=TensaoChoices.V380,
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    ResumoDimensionamento.objects.create(projeto=projeto, corrente_total_painel_a=Decimal("42"))
    produto = Produto.objects.create(
        codigo="DG-P3",
        descricao="DCM 50A",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    referencia = _referencia("42", fases=[Decimal("30"), Decimal("42"), Decimal("38")])

    with (
        patch(
            "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral._obter_referencia_corrente_entrada",
            return_value=referencia,
        ),
        patch(
            "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral.selecionar_disjuntores_caixa_moldada",
            return_value=Produto.objects.filter(pk=produto.pk),
        ) as mock_sel,
    ):
        sug = _nucleo_gerar_disjuntor_geral(projeto)

    assert sug is not None
    mock_sel.assert_called_once_with(corrente_nominal=Decimal("42"))
    assert sug.corrente_referencia_a == Decimal("42")
    assert "F2=42" in sug.memoria_calculo


@pytest.mark.django_db
def test_nucleo_corrente_zero_cria_pendencia(criar_projeto):
    projeto = criar_projeto(
        nome="Dg6",
        codigo="16006-26",
        tensao_nominal=TensaoChoices.V380,
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.MINIDISJUNTOR,
    )
    ResumoDimensionamento.objects.create(projeto=projeto, corrente_total_painel_a=Decimal("0"))
    with patch(
        "apps.configurador_paineis.composicao_painel.services.sugestoes.disjuntor_geral._obter_referencia_corrente_entrada",
        return_value=_referencia("0"),
    ):
        assert _nucleo_gerar_disjuntor_geral(projeto) is None
    p = PendenciaItem.objects.get(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
    )
    assert "zero" in p.descricao.lower() or "não foi calculada" in p.descricao.lower()


@pytest.mark.django_db
def test_gerar_sugestao_disjuntor_geral_limpa_anteriores(criar_projeto):
    projeto = criar_projeto(
        nome="Dg4",
        codigo="16004-26",
        tensao_nominal=TensaoChoices.V380,
        possui_disjuntor_geral=False,
    )
    PendenciaItem.objects.create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
        descricao="Antiga",
        memoria_calculo="x",
    )
    gerar_sugestao_disjuntor_geral(projeto)
    assert not PendenciaItem.objects.filter(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
    ).exists()
