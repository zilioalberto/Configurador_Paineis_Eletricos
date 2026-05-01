from decimal import Decimal
from unittest.mock import patch

import pytest

from cargas.models import Carga, CargaMotor, CargaResistencia
from catalogo.models import EspecificacaoMiniDisjuntor, Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.minidisjuntores import (
    gerar_sugestoes_minidisjuntores,
    processar_sugestao_minidisjuntores_para_carga,
    reprocessar_minidisjuntores_para_carga,
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
from core.choices import UnidadePotenciaCorrenteChoices
from core.choices.produtos import (
    CurvaDisparoMiniDisjuntorChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
    UnidadeMedidaChoices,
)


@pytest.mark.django_db
def test_minidisjuntor_motor_sem_cargamotor_cria_pendencia(criar_projeto):
    projeto = criar_projeto(nome="MD1", codigo="18001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    assert processar_sugestao_minidisjuntores_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
    ).exists()


@pytest.mark.django_db
def test_minidisjuntor_protecao_diferente_limpa_escopo(
    criar_projeto, criar_carga_motor
):
    projeto = criar_projeto(nome="MD2", codigo="18002-26", tensao_nominal=TensaoChoices.V380)
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
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    p = Produto.objects.create(
        codigo="MD-P2",
        descricao="Mini",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=p,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
        ordem=30,
    )
    assert processar_sugestao_minidisjuntores_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
    ).exists()


@pytest.mark.django_db
def test_minidisjuntor_corrente_ausente_cria_pendencia(
    criar_projeto, criar_carga_motor
):
    projeto = criar_projeto(nome="MD3", codigo="18003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M3",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.MINIDISJUNTOR,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    CargaMotor.objects.filter(carga=carga).update(corrente_calculada_a=None)
    assert processar_sugestao_minidisjuntores_para_carga(projeto, carga) is None
    p = PendenciaItem.objects.get(projeto=projeto, carga=carga)
    assert "corrente" in p.descricao.lower()


@pytest.mark.django_db
def test_minidisjuntor_selector_vazio_cria_pendencia(
    criar_projeto, criar_carga_motor
):
    projeto = criar_projeto(nome="MD4", codigo="18004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.MINIDISJUNTOR,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    with patch(
        "composicao_painel.services.sugestoes.minidisjuntores.selecionar_minidisjuntores",
        return_value=Produto.objects.none(),
    ):
        assert processar_sugestao_minidisjuntores_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        corrente_referencia_a__isnull=False,
    ).exists()


@pytest.mark.django_db
def test_minidisjuntor_motor_trifasico_escolhe_3p_e_corrente_maior(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="MD5", codigo="18005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.MINIDISJUNTOR,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("10"),
    )

    p_ok = Produto.objects.create(
        codigo="MD-3P16",
        descricao="Mini 3P 16A",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_ok,
        corrente_nominal_a=Decimal("16"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    p_out_polos = Produto.objects.create(
        codigo="MD-2P16",
        descricao="Mini 2P 16A",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_out_polos,
        corrente_nominal_a=Decimal("16"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P2,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    p_out_corrente = Produto.objects.create(
        codigo="MD-3P10",
        descricao="Mini 3P 10A",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_out_corrente,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )

    sug = processar_sugestao_minidisjuntores_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p_ok.id


@pytest.mark.django_db
def test_minidisjuntor_motor_somente_curva_b_sem_curva_c_cria_pendencia(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="MD5B", codigo="18005B-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5B",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.MINIDISJUNTOR,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("10"),
    )
    p_b = Produto.objects.create(
        codigo="MD-3P16-B",
        descricao="Mini 3P 16A B",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_b,
        corrente_nominal_a=Decimal("16"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.B,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    assert processar_sugestao_minidisjuntores_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_minidisjuntor_resistencia_com_protecao_cria_sugestao(criar_projeto):
    projeto = criar_projeto(nome="MD6", codigo="18006-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R1",
        descricao="R",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.MINIDISJUNTOR,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
        potencia_kw=Decimal("1"),
        corrente_calculada_a=Decimal("5"),
    )
    p_ok = Produto.objects.create(
        codigo="MD-R-3P10",
        descricao="Mini R",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_ok,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.B,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sug = processar_sugestao_minidisjuntores_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p_ok.id


@pytest.mark.django_db
def test_reprocessar_minidisjuntor_limpa_e_recalcula(
    criar_projeto, criar_carga_motor
):
    projeto = criar_projeto(nome="MD7", codigo="18007-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M7",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoMotorChoices.MINIDISJUNTOR,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("4"),
    )
    p = Produto.objects.create(
        codigo="MD-P7",
        descricao="Mini",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    assert reprocessar_minidisjuntores_para_carga(projeto, carga) is not None


@pytest.mark.django_db
def test_gerar_sugestoes_minidisjuntor_duas_cargas(
    criar_projeto, criar_carga_motor
):
    projeto = criar_projeto(nome="MD8", codigo="18008-26", tensao_nominal=TensaoChoices.V380)
    p = Produto.objects.create(
        codigo="MD-P8",
        descricao="Mini",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p,
        corrente_nominal_a=Decimal("25"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    for tag in ("MX", "MY"):
        carga = Carga.objects.create(
            projeto=projeto,
            tag=tag,
            descricao="M",
            tipo=TipoCargaChoices.MOTOR,
        )
        criar_carga_motor(
            carga=carga,
            tensao_motor=TensaoChoices.V380,
            tipo_protecao=TipoProtecaoMotorChoices.MINIDISJUNTOR,
            numero_fases=NumeroFasesChoices.TRIFASICO,
            potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
            potencia_corrente_valor=Decimal("8"),
        )
    out = gerar_sugestoes_minidisjuntores(projeto)
    assert len(out) == 2
