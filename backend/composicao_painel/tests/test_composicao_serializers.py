from decimal import Decimal

import pytest

from cargas.models import Carga
from catalogo.models import Produto
from composicao_painel.api.serializers import (
    ComposicaoItemSerializer,
    InclusaoManualCreateSerializer,
    SugestaoItemSerializer,
    _status_aprovacao_observacoes,
)
from composicao_painel.models import ComposicaoItem, SugestaoItem
from core.choices import CategoriaProdutoNomeChoices, PartesPainelChoices, TensaoChoices
from core.choices.cargas import TipoCargaChoices
from core.choices.produtos import UnidadeMedidaChoices


@pytest.mark.django_db
def test_status_aprovacao_observacoes_defaults_e_marker():
    assert _status_aprovacao_observacoes(None) == "Aprovado"
    assert _status_aprovacao_observacoes("obs\n[STATUS_APROVACAO] Alterado manualmente") == (
        "Alterado manualmente"
    )


@pytest.mark.django_db
def test_sugestao_item_serializer_inclui_snapshot_carga_e_projeto(
    criar_projeto, criar_carga_motor
):
    projeto = criar_projeto(nome="Comp", codigo="22001-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="COMP-P1",
        descricao="Produto",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        potencia_corrente_valor=Decimal("5.00"),
        tensao_motor=TensaoChoices.V380,
    )
    sug = SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=1,
        corrente_referencia_a=Decimal("7.5"),
    )
    data = SugestaoItemSerializer(sug).data
    assert data["produto_codigo"] == "COMP-P1"
    assert data["carga"]["tag"] == "M01"
    assert data["carga"]["corrente_a"] == "7.5"
    assert data["projeto_alimentacao"]["tensao_nominal"] == TensaoChoices.V380


@pytest.mark.django_db
def test_composicao_item_serializer_status_display_from_marker(criar_projeto):
    projeto = criar_projeto(nome="Comp2", codigo="22002-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="COMP-P2",
        descricao="Produto",
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
        observacoes="[STATUS_APROVACAO] Reaberto e aprovado",
    )
    data = ComposicaoItemSerializer(item).data
    assert data["status_display"] == "Reaberto e aprovado"


def test_inclusao_manual_create_serializer_defaults():
    ser = InclusaoManualCreateSerializer(data={"produto_id": "00000000-0000-0000-0000-000000000001"})
    assert ser.is_valid(), ser.errors
    assert str(ser.validated_data["quantidade"]) == "1"
    assert ser.validated_data["observacoes"] == ""
