from decimal import Decimal
from unittest.mock import patch

import pytest

from cargas.models import Carga, CargaMotor, CargaResistencia
from catalogo.models import Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.disjuntores_motor import (
    gerar_sugestoes_disjuntores_motor,
    processar_sugestao_disjuntor_motor_para_carga,
    reprocessar_disjuntor_motor_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    TensaoChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
)
from core.choices.produtos import UnidadeMedidaChoices


@pytest.mark.django_db
def test_disjuntor_motor_motor_sem_registro_cria_pendencia(criar_projeto):
    projeto = criar_projeto(nome="DM1", codigo="14001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    assert processar_sugestao_disjuntor_motor_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
    ).exists()


@pytest.mark.django_db
def test_disjuntor_motor_protecao_diferente_limpa_escopo(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="DM2", codigo="14002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M2",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.RELE_SOBRECARGA,
    )
    produto = Produto.objects.create(
        codigo="DM-P1",
        descricao="D",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        quantidade=Decimal("1"),
        ordem=30,
    )
    assert processar_sugestao_disjuntor_motor_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_disjuntor_motor_tipo_nao_tratado_retorna_none(criar_projeto):
    projeto = criar_projeto(nome="DM3", codigo="14003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S1",
        descricao="S",
        tipo=TipoCargaChoices.SENSOR,
    )
    assert processar_sugestao_disjuntor_motor_para_carga(projeto, carga) is None


@pytest.mark.django_db
def test_disjuntor_motor_corrente_ausente_cria_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="DM4", codigo="14004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    CargaMotor.objects.filter(carga=carga).update(corrente_calculada_a=None)
    assert processar_sugestao_disjuntor_motor_para_carga(projeto, carga) is None
    p = PendenciaItem.objects.get(projeto=projeto, carga=carga)
    assert "corrente" in p.descricao.lower()


@pytest.mark.django_db
def test_disjuntor_motor_selector_vazio_cria_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="DM5", codigo="14005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    with patch(
        "composicao_painel.services.sugestoes.disjuntores_motor.selecionar_disjuntores_motor",
        return_value=Produto.objects.none(),
    ):
        assert processar_sugestao_disjuntor_motor_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        corrente_referencia_a__isnull=False,
    ).exists()


@pytest.mark.django_db
def test_disjuntor_motor_cria_sugestao_com_produto_do_selector(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="DM6", codigo="14006-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M6",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="DM-P6",
        descricao="Disj",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.disjuntores_motor.selecionar_disjuntores_motor",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sug = processar_sugestao_disjuntor_motor_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == produto.id


@pytest.mark.django_db
def test_disjuntor_motor_resistencia_sem_registro_pendencia(criar_projeto):
    projeto = criar_projeto(nome="DM7", codigo="14007-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R1",
        descricao="R",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    assert processar_sugestao_disjuntor_motor_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_disjuntor_motor_resistencia_protecao_errada_limpa(criar_projeto):
    projeto = criar_projeto(nome="DM8", codigo="14008-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R2",
        descricao="R",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
        potencia_kw=Decimal("2.000"),
    )
    assert processar_sugestao_disjuntor_motor_para_carga(projeto, carga) is None


@pytest.mark.django_db
def test_reprocessar_disjuntor_motor_limpa_e_recalcula(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="DM9", codigo="14009-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M9",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="DM-P9",
        descricao="D",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.disjuntores_motor.selecionar_disjuntores_motor",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        assert reprocessar_disjuntor_motor_para_carga(projeto, carga) is not None


@pytest.mark.django_db
def test_gerar_sugestoes_disjuntores_motor_sem_cargas_elegiveis(criar_projeto):
    projeto = criar_projeto(nome="DM10", codigo="14010-26", tensao_nominal=TensaoChoices.V380)
    Carga.objects.create(
        projeto=projeto,
        tag="S1",
        descricao="S",
        tipo=TipoCargaChoices.SENSOR,
    )
    assert gerar_sugestoes_disjuntores_motor(projeto) == []


@pytest.mark.django_db
def test_gerar_sugestoes_disjuntores_motor_duas_cargas_motor(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="DM11", codigo="14011-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="DM-P11",
        descricao="D",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    for tag in ("MA", "MB"):
        carga = Carga.objects.create(
            projeto=projeto,
            tag=tag,
            descricao="M",
            tipo=TipoCargaChoices.MOTOR,
        )
        criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    with patch(
        "composicao_painel.services.sugestoes.disjuntores_motor.selecionar_disjuntores_motor",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        out = gerar_sugestoes_disjuntores_motor(projeto)
    assert len(out) == 2
