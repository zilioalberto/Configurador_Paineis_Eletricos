from decimal import Decimal
from unittest.mock import patch

import pytest

from cargas.models import Carga, CargaMotor
from catalogo.models import Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.rele_sobrecarga import (
    gerar_sugestoes_reles_sobrecarga,
    processar_sugestao_rele_sobrecarga_para_carga,
    reprocessar_rele_sobrecarga_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    TensaoChoices,
)
from core.choices.cargas import TipoCargaChoices, TipoProtecaoMotorChoices
from core.choices.produtos import UnidadeMedidaChoices


@pytest.mark.django_db
def test_rele_sobrecarga_motor_sem_registro_cria_pendencia(criar_projeto):
    projeto = criar_projeto(nome="RS1", codigo="15001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    assert processar_sugestao_rele_sobrecarga_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ).exists()


@pytest.mark.django_db
def test_rele_sobrecarga_protecao_diferente_limpa_escopo(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="RS2", codigo="15002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M2",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.DISJUNTOR_MOTOR,
    )
    produto = Produto.objects.create(
        codigo="RS-P2",
        descricao="Relé",
        categoria=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        quantidade=Decimal("1"),
        ordem=30,
    )
    assert processar_sugestao_rele_sobrecarga_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
    ).exists()


@pytest.mark.django_db
def test_rele_sobrecarga_tipo_nao_tratado_retorna_none(criar_projeto):
    projeto = criar_projeto(nome="RS3", codigo="15003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S1",
        descricao="S",
        tipo=TipoCargaChoices.SENSOR,
    )
    assert processar_sugestao_rele_sobrecarga_para_carga(projeto, carga) is None


@pytest.mark.django_db
def test_rele_sobrecarga_corrente_ausente_cria_pendencia(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="RS4", codigo="15004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.RELE_SOBRECARGA,
    )
    CargaMotor.objects.filter(carga=carga).update(corrente_calculada_a=None)
    assert processar_sugestao_rele_sobrecarga_para_carga(projeto, carga) is None
    p = PendenciaItem.objects.get(projeto=projeto, carga=carga)
    assert "corrente" in p.descricao.lower()


@pytest.mark.django_db
def test_rele_sobrecarga_selector_vazio_cria_pendencia(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="RS5", codigo="15005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.RELE_SOBRECARGA,
    )
    with patch(
        "composicao_painel.services.sugestoes.rele_sobrecarga.selecionar_reles_sobrecarga",
        return_value=Produto.objects.none(),
    ):
        assert processar_sugestao_rele_sobrecarga_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        corrente_referencia_a__isnull=False,
    ).exists()


@pytest.mark.django_db
def test_rele_sobrecarga_cria_sugestao_com_produto_do_selector(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="RS6", codigo="15006-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M6",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.RELE_SOBRECARGA,
    )
    produto = Produto.objects.create(
        codigo="RS-P6",
        descricao="Relé",
        categoria=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.rele_sobrecarga.selecionar_reles_sobrecarga",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sug = processar_sugestao_rele_sobrecarga_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == produto.id
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.RELE_SOBRECARGA


@pytest.mark.django_db
def test_reprocessar_rele_sobrecarga_limpa_e_recalcula(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="RS7", codigo="15007-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M7",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.RELE_SOBRECARGA,
    )
    produto = Produto.objects.create(
        codigo="RS-P7",
        descricao="Relé",
        categoria=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.rele_sobrecarga.selecionar_reles_sobrecarga",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        assert reprocessar_rele_sobrecarga_para_carga(projeto, carga) is not None


@pytest.mark.django_db
def test_gerar_sugestoes_reles_sobrecarga_duas_cargas_motor(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="RS8", codigo="15008-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="RS-P8",
        descricao="Relé",
        categoria=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    for tag in ("MA", "MB"):
        carga = Carga.objects.create(
            projeto=projeto,
            tag=tag,
            descricao="M",
            tipo=TipoCargaChoices.MOTOR,
        )
        criar_carga_motor(
            carga=carga,
            tensao_motor=TensaoChoices.V380,
            tipo_protecao=TipoProtecaoMotorChoices.RELE_SOBRECARGA,
        )
    with patch(
        "composicao_painel.services.sugestoes.rele_sobrecarga.selecionar_reles_sobrecarga",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        out = gerar_sugestoes_reles_sobrecarga(projeto)
    assert len(out) == 2
