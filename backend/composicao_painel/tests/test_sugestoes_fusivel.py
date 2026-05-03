from decimal import Decimal
from unittest.mock import patch

import pytest

from cargas.models import Carga, CargaMotor, CargaResistencia
from catalogo.models import Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.fusivel import (
    gerar_sugestoes_fusiveis,
    processar_sugestao_fusivel_para_carga,
    reprocessar_fusivel_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    PartesPainelChoices,
    TensaoChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
    TipoProtecaoMotorChoices,
    TipoProtecaoResistenciaChoices,
)
from core.choices.eletrica import NumeroFasesChoices
from core.choices.produtos import TipoFusivelChoices, UnidadeMedidaChoices


@pytest.mark.django_db
def test_fusivel_motor_sem_registro_cria_pendencia(criar_projeto):
    projeto = criar_projeto(nome="FU1", codigo="17001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    assert processar_sugestao_fusivel_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
    ).exists()


@pytest.mark.django_db
def test_fusivel_protecao_diferente_limpa_escopo(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="FU2", codigo="17002-26", tensao_nominal=TensaoChoices.V380)
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
        codigo="FU-P2",
        descricao="Fusível",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
        quantidade=Decimal("1"),
        ordem=30,
    )
    assert processar_sugestao_fusivel_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
    ).exists()


@pytest.mark.django_db
def test_fusivel_tipo_nao_tratado_retorna_none(criar_projeto):
    projeto = criar_projeto(nome="FU3", codigo="17003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S1",
        descricao="S",
        tipo=TipoCargaChoices.SENSOR,
    )
    assert processar_sugestao_fusivel_para_carga(projeto, carga) is None


@pytest.mark.django_db
def test_fusivel_corrente_ausente_cria_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="FU4", codigo="17004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.FUSIVEL,
    )
    CargaMotor.objects.filter(carga=carga).update(corrente_calculada_a=None)
    assert processar_sugestao_fusivel_para_carga(projeto, carga) is None
    p = PendenciaItem.objects.get(projeto=projeto, carga=carga)
    assert "corrente" in p.descricao.lower()


@pytest.mark.django_db
def test_fusivel_selector_vazio_cria_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="FU5", codigo="17005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.FUSIVEL,
    )
    with patch(
        "composicao_painel.services.sugestoes.fusivel.selecionar_fusiveis",
        return_value=Produto.objects.none(),
    ):
        assert processar_sugestao_fusivel_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        corrente_referencia_a__isnull=False,
    ).exists()


@pytest.mark.django_db
def test_fusivel_cria_sugestao_com_produto_do_selector(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="FU6", codigo="17006-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M6",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.FUSIVEL,
    )
    produto = Produto.objects.create(
        codigo="FU-P6",
        descricao="Fusível",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.fusivel.selecionar_fusiveis",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sug = processar_sugestao_fusivel_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == produto.id
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.FUSIVEL


@pytest.mark.django_db
def test_reprocessar_fusivel_limpa_e_recalcula(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="FU7", codigo="17007-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M7",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.FUSIVEL,
    )
    produto = Produto.objects.create(
        codigo="FU-P7",
        descricao="Fusível",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.fusivel.selecionar_fusiveis",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        assert reprocessar_fusivel_para_carga(projeto, carga) is not None


@pytest.mark.django_db
def test_gerar_sugestoes_fusiveis_duas_cargas_motor(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="FU8", codigo="17008-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="FU-P8",
        descricao="Fusível",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
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
            tipo_protecao=TipoProtecaoMotorChoices.FUSIVEL,
        )
    with patch(
        "composicao_painel.services.sugestoes.fusivel.selecionar_fusiveis",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        out = gerar_sugestoes_fusiveis(projeto)
    assert len(out) == 2


@pytest.mark.django_db
def test_fusivel_resistencia_ultrarrapido_usa_selector_ultrarrapido_e_corrente_gte(
    criar_projeto,
):
    projeto = criar_projeto(nome="FU9", codigo="17009-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R1",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        potencia_kw=Decimal("4.000"),
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
    )
    espec = CargaResistencia.objects.get(carga=carga)
    assert espec.corrente_calculada_a is not None

    produto = Produto.objects.create(
        codigo="FU-R1",
        descricao="Fusível gG ultrarrápido",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.fusivel.selecionar_fusiveis",
        return_value=Produto.objects.filter(pk=produto.pk),
    ) as mock_sel:
        sug = processar_sugestao_fusivel_para_carga(projeto, carga)

    mock_sel.assert_called_once()
    _, kwargs = mock_sel.call_args
    assert kwargs["tipo_fusivel"] == TipoFusivelChoices.ULTRARAPIDO
    assert kwargs["corrente_nominal_min_a"] == espec.corrente_calculada_a
    assert kwargs.get("corrente_nominal_maior_que_a") is None

    assert sug is not None
    assert sug.produto_id == produto.id
    assert "ULTRARAPIDO" in (sug.memoria_calculo or "").upper()


@pytest.mark.django_db
def test_fusivel_resistencia_minidisjuntor_limpa_escopo(criar_projeto):
    projeto = criar_projeto(nome="FU10", codigo="17010-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R2",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        potencia_kw=Decimal("2.000"),
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
    )
    produto = Produto.objects.create(
        codigo="FU-R2",
        descricao="Fusível",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
        quantidade=Decimal("1"),
        ordem=30,
    )
    CargaResistencia.objects.filter(carga=carga).update(
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR
    )
    assert processar_sugestao_fusivel_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.FUSIVEL,
    ).exists()


@pytest.mark.django_db
def test_gerar_sugestoes_fusiveis_motor_e_resistencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="FU11", codigo="17011-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="FU-P11",
        descricao="Fusível",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    carga_m = Carga.objects.create(
        projeto=projeto,
        tag="M11",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga_m,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.FUSIVEL,
    )
    carga_r = Carga.objects.create(
        projeto=projeto,
        tag="R11",
        descricao="R",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga_r,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        potencia_kw=Decimal("3.000"),
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
    )
    with patch(
        "composicao_painel.services.sugestoes.fusivel.selecionar_fusiveis",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        out = gerar_sugestoes_fusiveis(projeto)
    assert len(out) == 2
