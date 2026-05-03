"""Cobre `seccionadoras.py` (antes ~8% no relatório de cobertura)."""

from decimal import Decimal
from unittest.mock import Mock, patch

import pytest

from catalogo.models import Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.seccionadoras import (
    _nucleo_gerar_seccionamento,
    gerar_sugestao_seccionamento,
    reprocessar_seccionamento_para_pendencia,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    TensaoChoices,
    TipoSeccionamentoChoices,
)
from core.choices.produtos import UnidadeMedidaChoices
from dimensionamento.models import ResumoDimensionamento
from projetos.models import Projeto


@pytest.mark.django_db
def test_nucleo_sem_seccionamento_retorna_none(criar_projeto):
    projeto = criar_projeto(
        nome="Sec0",
        codigo="15000-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=False,
    )
    assert _nucleo_gerar_seccionamento(projeto) is None


@pytest.mark.django_db
def test_nucleo_sem_resumo_dimensionamento_cria_pendencia_outros(criar_projeto):
    projeto = criar_projeto(
        nome="Sec1",
        codigo="15001-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.SECCIONADORA,
    )
    assert _nucleo_gerar_seccionamento(projeto) is None
    p = PendenciaItem.objects.get(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
    )
    assert p.categoria_produto == CategoriaProdutoNomeChoices.OUTROS
    assert "dimensionamento" in p.descricao.lower()


@pytest.mark.django_db
def test_nucleo_corrente_total_nula_cria_pendencia(criar_projeto):
    projeto = criar_projeto(
        nome="Sec2",
        codigo="15002-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.SECCIONADORA,
    )
    resumo_fake = Mock()
    resumo_fake.corrente_total_painel_a = None
    with patch(
        "composicao_painel.services.sugestoes.seccionadoras.ResumoDimensionamento.objects.get",
        return_value=resumo_fake,
    ):
        assert _nucleo_gerar_seccionamento(projeto) is None
    p = PendenciaItem.objects.get(projeto=projeto)
    assert "corrente total" in p.descricao.lower()


@pytest.mark.django_db
def test_nucleo_tipo_seccionamento_ausente_cria_pendencia(criar_projeto):
    projeto = criar_projeto(
        nome="Sec3",
        codigo="15003-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.SECCIONADORA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("80"),
    )
    Projeto.objects.filter(pk=projeto.pk).update(tipo_seccionamento="")
    projeto.refresh_from_db()
    assert _nucleo_gerar_seccionamento(projeto) is None
    p = PendenciaItem.objects.get(projeto=projeto)
    assert "tipo de seccionamento" in p.descricao.lower()


@pytest.mark.django_db
def test_nucleo_seccionadora_sem_produto_cria_pendencia(criar_projeto):
    projeto = criar_projeto(
        nome="Sec4",
        codigo="15004-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.SECCIONADORA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("200"),
    )
    with patch(
        "composicao_painel.services.sugestoes.seccionadoras.selecionar_seccionadoras",
        return_value=Produto.objects.none(),
    ):
        assert _nucleo_gerar_seccionamento(projeto) is None
    p = PendenciaItem.objects.get(
        projeto=projeto,
        categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
    )
    assert "seccionadora" in p.descricao.lower()


@pytest.mark.django_db
def test_nucleo_seccionadora_com_produto_cria_sugestao(criar_projeto):
    projeto = criar_projeto(
        nome="Sec5",
        codigo="15005-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.SECCIONADORA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("50"),
    )
    produto = Produto.objects.create(
        codigo="SEC-P1",
        descricao="Seccionadora",
        categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.seccionadoras.selecionar_seccionadoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sug = _nucleo_gerar_seccionamento(projeto)
    assert sug is not None
    assert sug.produto_id == produto.id
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.SECCIONADORA


@pytest.mark.django_db
def test_nucleo_disjuntor_cm_sem_produto_cria_pendencia(criar_projeto):
    projeto = criar_projeto(
        nome="Sec6",
        codigo="15006-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("120"),
    )
    with patch(
        "composicao_painel.services.sugestoes.seccionadoras.selecionar_disjuntores_caixa_moldada",
        return_value=Produto.objects.none(),
    ):
        assert _nucleo_gerar_seccionamento(projeto) is None
    p = PendenciaItem.objects.get(
        projeto=projeto,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    assert "caixa moldada" in p.descricao.lower()


@pytest.mark.django_db
def test_nucleo_disjuntor_cm_com_produto_cria_sugestao(criar_projeto):
    projeto = criar_projeto(
        nome="Sec7",
        codigo="15007-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("30"),
    )
    produto = Produto.objects.create(
        codigo="SEC-P2",
        descricao="DCM",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.seccionadoras.selecionar_disjuntores_caixa_moldada",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sug = _nucleo_gerar_seccionamento(projeto)
    assert sug is not None
    assert sug.produto_id == produto.id


@pytest.mark.django_db
def test_nucleo_tipo_seccionamento_invalido_cria_pendencia_outros(criar_projeto):
    projeto = criar_projeto(
        nome="Sec8",
        codigo="15008-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.SECCIONADORA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("40"),
    )
    Projeto.objects.filter(pk=projeto.pk).update(tipo_seccionamento="TIPO_INVALIDO_TESTE")
    projeto.refresh_from_db()
    assert _nucleo_gerar_seccionamento(projeto) is None
    p = PendenciaItem.objects.get(
        projeto=projeto,
        categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
    )
    assert "inválido" in p.descricao.lower()


@pytest.mark.django_db
def test_gerar_sugestao_seccionamento_remove_sugestoes_anteriores(criar_projeto):
    projeto = criar_projeto(
        nome="Sec9",
        codigo="15009-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.SECCIONADORA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("10"),
    )
    velho = Produto.objects.create(
        codigo="SEC-OLD",
        descricao="Old",
        categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
        produto=velho,
        quantidade=Decimal("1"),
        ordem=10,
    )
    novo = Produto.objects.create(
        codigo="SEC-NEW",
        descricao="New",
        categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.seccionadoras.selecionar_seccionadoras",
        return_value=Produto.objects.filter(pk=novo.pk),
    ):
        gerar_sugestao_seccionamento(projeto)
    assert not SugestaoItem.objects.filter(projeto=projeto, produto=velho).exists()
    assert SugestaoItem.objects.filter(projeto=projeto, produto=novo).exists()


@pytest.mark.django_db
def test_reprocessar_seccionamento_para_pendencia_limpa_e_reexecuta(criar_projeto):
    projeto = criar_projeto(
        nome="SecA",
        codigo="15010-26",
        tensao_nominal=TensaoChoices.V380,
        possui_seccionamento=True,
        tipo_seccionamento=TipoSeccionamentoChoices.SECCIONADORA,
    )
    ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=Decimal("25"),
    )
    pend = PendenciaItem.objects.create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
        carga=None,
        descricao="antiga",
        ordem=10,
    )
    produto = Produto.objects.create(
        codigo="SEC-P3",
        descricao="S",
        categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.seccionadoras.selecionar_seccionadoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        reprocessar_seccionamento_para_pendencia(projeto, pend)
    assert not PendenciaItem.objects.filter(pk=pend.pk).exists()
    assert SugestaoItem.objects.filter(projeto=projeto, produto=produto).exists()
