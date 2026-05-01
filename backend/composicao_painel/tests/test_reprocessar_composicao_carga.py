from decimal import Decimal
from unittest.mock import patch

import pytest
from django.core.exceptions import ValidationError

from cargas.models import Carga
from catalogo.models import Produto
from composicao_painel.models import ComposicaoItem, PendenciaItem, SugestaoItem
from composicao_painel.services.reprocessar_composicao_carga import (
    reprocessar_composicao_painel_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    TensaoChoices,
)
from core.choices.cargas import TipoCargaChoices
from core.choices.produtos import UnidadeMedidaChoices


@pytest.mark.django_db
def test_reprocessar_remove_aprovados_sugestoes_e_pendencias_da_carga(
    criar_projeto,
):
    projeto = criar_projeto(
        nome="P",
        codigo="08001-26",
        tensao_nominal=TensaoChoices.V380,
    )
    produto = Produto.objects.create(
        codigo="DJM-TEST-1",
        descricao="Teste",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        quantidade=Decimal("1"),
        ordem=30,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=40,
    )
    PendenciaItem.objects.create(
        projeto=projeto,
        carga=carga,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        descricao="pendência teste",
        ordem=30,
    )

    with (
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_disjuntor_motor_para_carga"
        ) as mock_d,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_contatora_para_carga"
        ) as mock_c,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_minidisjuntores_para_carga"
        ) as mock_md,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_soft_starter_para_carga"
        ) as mock_ss,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_inversores_frequencia_para_carga"
        ) as mock_if,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.calcular_e_salvar_dimensionamento_basico"
        ),
    ):
        reprocessar_composicao_painel_para_carga(projeto, carga)

    assert ComposicaoItem.objects.filter(projeto=projeto, carga=carga).count() == 0
    assert SugestaoItem.objects.filter(projeto=projeto, carga=carga).count() == 0
    assert PendenciaItem.objects.filter(projeto=projeto, carga=carga).count() == 0
    mock_d.assert_called_once_with(projeto, carga)
    mock_c.assert_called_once_with(projeto, carga)
    mock_md.assert_called_once_with(projeto, carga)
    mock_ss.assert_called_once_with(projeto, carga)
    mock_if.assert_called_once_with(projeto, carga)


@pytest.mark.django_db
def test_reprocessar_troca_projeto_e_ignora_erro_contatora(criar_projeto):
    projeto_real = criar_projeto(nome="P2", codigo="08002-26", tensao_nominal=TensaoChoices.V380)
    projeto_fake = criar_projeto(nome="P3", codigo="08003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto_real,
        tag="M02",
        descricao="Motor 2",
        tipo=TipoCargaChoices.MOTOR,
    )

    with (
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_disjuntor_motor_para_carga"
        ) as mock_d,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_contatora_para_carga",
            side_effect=ValidationError("erro esperado"),
        ) as mock_c,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_minidisjuntores_para_carga"
        ) as mock_md,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_soft_starter_para_carga"
        ) as mock_ss,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.reprocessar_inversores_frequencia_para_carga"
        ) as mock_if,
        patch(
            "composicao_painel.services.reprocessar_composicao_carga.calcular_e_salvar_dimensionamento_basico"
        ) as mock_dim,
    ):
        reprocessar_composicao_painel_para_carga(projeto_fake, carga)

    mock_d.assert_called_once_with(projeto_real, carga)
    mock_c.assert_called_once_with(projeto_real, carga)
    mock_md.assert_called_once_with(projeto_real, carga)
    mock_ss.assert_called_once_with(projeto_real, carga)
    mock_if.assert_called_once_with(projeto_real, carga)
    mock_dim.assert_called_once_with(projeto_real)
