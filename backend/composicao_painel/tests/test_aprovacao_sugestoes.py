"""Testes do serviço de aprovação / reabertura de sugestões (cobertura Sonar)."""

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from cargas.models import Carga
from catalogo.models import Produto
from composicao_painel.models import ComposicaoItem, SugestaoItem
from composicao_painel.services.sugestoes.aprovacao_sugestoes import (
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
