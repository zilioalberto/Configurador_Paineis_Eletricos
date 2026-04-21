from decimal import Decimal
from unittest.mock import Mock, patch

import pytest
from django.core.exceptions import ValidationError

from cargas.models import Carga, CargaMotor
from catalogo.models import Produto
from composicao_painel.models import ComposicaoItem, SugestaoItem
from composicao_painel.services.sugestoes.orquestrador import (
    gerar_sugestoes_painel,
    projeto_tem_motor_com_disjuntor_motor,
    remover_sugestoes_ja_aprovadas,
)
from core.choices import CategoriaProdutoNomeChoices, PartesPainelChoices, TensaoChoices
from core.choices.cargas import TipoCargaChoices, TipoProtecaoMotorChoices
from core.choices.produtos import UnidadeMedidaChoices


@pytest.mark.django_db
def test_projeto_tem_motor_com_disjuntor_motor_true_e_false(criar_projeto):
    projeto = criar_projeto(nome="Orq", codigo="12001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    CargaMotor.objects.create(
        carga=carga,
        potencia_corrente_valor=Decimal("5.00"),
        tipo_protecao=TipoProtecaoMotorChoices.DISJUNTOR_MOTOR,
    )
    assert projeto_tem_motor_com_disjuntor_motor(projeto) is True

    CargaMotor.objects.filter(carga=carga).update(
        tipo_protecao=TipoProtecaoMotorChoices.RELE_SOBRECARGA
    )
    assert projeto_tem_motor_com_disjuntor_motor(projeto) is False


@pytest.mark.django_db
def test_remover_sugestoes_ja_aprovadas_remove_apenas_correspondentes(criar_projeto):
    projeto = criar_projeto(nome="Orq2", codigo="12002-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="ORQ-P1",
        descricao="Produto",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M02",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=1,
    )
    removida = SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=2,
    )
    mantida = SugestaoItem.objects.create(
        projeto=projeto,
        carga=None,
        produto=produto,
        parte_painel=PartesPainelChoices.SECCIONAMENTO,
        categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
        quantidade=Decimal("1"),
        ordem=3,
    )

    total = remover_sugestoes_ja_aprovadas(projeto)
    assert total == 1
    assert not SugestaoItem.objects.filter(pk=removida.pk).exists()
    assert SugestaoItem.objects.filter(pk=mantida.pk).exists()


@pytest.mark.django_db
def test_gerar_sugestoes_painel_none_levanta_erro():
    with pytest.raises(ValidationError):
        gerar_sugestoes_painel(None)


@pytest.mark.django_db
@patch("composicao_painel.services.sugestoes.orquestrador.montar_etapas_geracao")
@patch("composicao_painel.services.sugestoes.orquestrador.remover_sugestoes_ja_aprovadas")
@patch("composicao_painel.services.sugestoes.orquestrador.limpar_sugestoes_projeto")
def test_gerar_sugestoes_painel_cobre_none_lista_item_e_erro(
    mock_limpar,
    mock_remover,
    mock_montar,
    criar_projeto,
):
    projeto = criar_projeto(nome="Orq3", codigo="12003-26", tensao_nominal=TensaoChoices.V380)
    etapa_none = Mock(return_value=None)
    etapa_lista = Mock(return_value=["s1", "s2"])
    etapa_item = Mock(return_value="s3")
    etapa_erro = Mock(side_effect=RuntimeError("boom"))
    mock_montar.return_value = [
        ("ETAPA_NONE", etapa_none),
        ("ETAPA_LISTA", etapa_lista),
        ("ETAPA_ITEM", etapa_item),
        ("ETAPA_ERRO", etapa_erro),
    ]
    mock_remover.return_value = 2

    resultado = gerar_sugestoes_painel(projeto, limpar_antes=True)
    assert resultado["projeto_id"] == projeto.id
    assert resultado["total_sugestoes"] == 3
    assert resultado["sugestoes"] == ["s1", "s2", "s3"]
    assert resultado["sugestoes_descartadas_aprovadas"] == 2
    assert resultado["erros"] == [{"etapa": "ETAPA_ERRO", "erro": "boom"}]
    mock_limpar.assert_called_once_with(projeto)
