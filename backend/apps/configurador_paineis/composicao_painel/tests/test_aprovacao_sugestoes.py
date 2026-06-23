"""Testes do serviço de aprovação / reabertura de sugestões (cobertura Sonar)."""

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from apps.configurador_paineis.cargas.models import Carga
from apps.catalogo.models import Produto
from apps.configurador_paineis.composicao_painel.models import ComposicaoItem, SugestaoItem
from apps.configurador_paineis.composicao_painel.services.sugestoes.aprovacao_sugestoes import (
    aprovar_sugestao_item,
    reabrir_composicao_item_para_sugestao,
)
from core.choices import CategoriaProdutoNomeChoices, PartesPainelChoices, TensaoChoices
from core.choices.cargas import TipoCargaChoices
from core.choices.produtos import UnidadeMedidaChoices


@pytest.mark.django_db
def test_aprovar_rejeita_substituto_outra_categoria(criar_projeto):
    projeto = criar_projeto(nome="Ap", codigo="10101-26", tensao_nominal=TensaoChoices.V380)
    p_cont = Produto.objects.create(
        codigo="AP-C1",
        descricao="C",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    p_dj = Produto.objects.create(
        codigo="AP-D1",
        descricao="D",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=p_cont,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=1,
    )
    with pytest.raises(ValidationError):
        aprovar_sugestao_item(sugestao, produto_substituto=p_dj)


@pytest.mark.django_db
def test_aprovar_sugestao_removida_retorna_validacao(criar_projeto):
    projeto = criar_projeto(nome="Ap removida", codigo="10103-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="AP-R1",
        descricao="Removida",
        categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=None,
        produto=produto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
        quantidade=Decimal("1"),
        ordem=1,
    )
    sugestao_id = sugestao.id
    SugestaoItem.objects.filter(pk=sugestao_id).delete()

    with pytest.raises(ValidationError, match="não está mais disponível"):
        aprovar_sugestao_item(sugestao)

    assert not ComposicaoItem.objects.filter(projeto=projeto).exists()


@pytest.mark.django_db
def test_aprovar_sugestao_sem_carga_com_lock(criar_projeto):
    """Bornes e itens globais têm carga nula; o lock não pode usar FOR UPDATE no outer join."""
    projeto = criar_projeto(nome="Ap borne", codigo="10104-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="AP-B1",
        descricao="Borne",
        categoria=CategoriaProdutoNomeChoices.BORNE,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=None,
        produto=produto,
        parte_painel=PartesPainelChoices.BORNES,
        categoria_produto=CategoriaProdutoNomeChoices.BORNE,
        quantidade=Decimal("3"),
        ordem=1,
    )
    item = aprovar_sugestao_item(sugestao, usuario_nome="Tester")
    assert item.produto_id == produto.id
    assert item.carga_id is None
    assert not SugestaoItem.objects.filter(pk=sugestao.pk).exists()


@pytest.mark.django_db
def test_aprovar_dois_itens_sem_carga_mesma_categoria_indices_distintos(criar_projeto):
    """Itens globais (carga nula) da mesma parte/categoria só diferem pelo índice de escopo.

    Aprovar o segundo não pode violar o unique constraint do ComposicaoItem (regressão do 500).
    """
    projeto = criar_projeto(
        nome="Ap cabos", codigo="10105-26", tensao_nominal=TensaoChoices.V380
    )
    produto = Produto.objects.create(
        codigo="AP-CB1",
        descricao="Cabo",
        categoria=CategoriaProdutoNomeChoices.CABO,
        unidade_medida=UnidadeMedidaChoices.MT,
    )
    sugestoes = [
        SugestaoItem.objects.create(
            projeto=projeto,
            carga=None,
            produto=produto,
            parte_painel=PartesPainelChoices.ACESSORIOS,
            categoria_produto=CategoriaProdutoNomeChoices.CABO,
            quantidade=Decimal("2"),
            indice_escopo=indice,
            ordem=indice,
        )
        for indice in (700, 701)
    ]

    for sugestao in sugestoes:
        aprovar_sugestao_item(sugestao, usuario_nome="Tester")

    itens = ComposicaoItem.objects.filter(
        projeto=projeto,
        carga__isnull=True,
        parte_painel=PartesPainelChoices.ACESSORIOS,
        categoria_produto=CategoriaProdutoNomeChoices.CABO,
    )
    assert itens.count() == 2
    assert set(itens.values_list("indice_escopo", flat=True)) == {700, 701}


@pytest.mark.django_db
def test_reabrir_composicao_cria_sugestao(criar_projeto):
    projeto = criar_projeto(nome="Rb", codigo="10102-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="RB-P1",
        descricao="P",
        categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    item = ComposicaoItem.objects.create(
        projeto=projeto,
        carga=None,
        produto=produto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
        quantidade=Decimal("1"),
        ordem=1,
    )
    sug = reabrir_composicao_item_para_sugestao(item, usuario_nome="Tester")
    assert sug.projeto_id == projeto.id
    assert not ComposicaoItem.objects.filter(pk=item.pk).exists()
