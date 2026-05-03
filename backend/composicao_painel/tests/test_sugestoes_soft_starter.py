from decimal import Decimal
from unittest.mock import patch

import pytest

from cargas.models import Carga, CargaMotor
from catalogo.models import EspecificacaoSoftStarter, Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.soft_starter import (
    gerar_sugestoes_soft_starters,
    processar_sugestao_soft_starter_para_carga,
    reprocessar_soft_starter_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    TensaoChoices,
    UnidadePotenciaCorrenteChoices,
)
from core.choices.cargas import TipoCargaChoices, TipoPartidaMotorChoices
from core.choices.produtos import ModoMontagemChoices, UnidadeMedidaChoices
@pytest.mark.django_db
def test_soft_starter_apenas_motor_trifasico_soft_partida(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="SS1", codigo="19001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.SOFT_STARTER,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("10"),
    )
    p = Produto.objects.create(
        codigo="SS-01",
        descricao="Soft",
        categoria=CategoriaProdutoNomeChoices.SOFT_STARTER,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoSoftStarter.objects.create(
        produto=p,
        corrente_nominal_a=Decimal("20"),
        tensao_nominal_v=TensaoChoices.V380,
        tipo_montagem=ModoMontagemChoices.PLACA,
    )
    sug = processar_sugestao_soft_starter_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.SOFT_STARTER
    assert sug.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA


@pytest.mark.django_db
def test_soft_starter_partida_direta_limpa_escopo(criar_projeto, criar_carga_motor):
    """Sugestão órfã de soft starter é removida quando a partida não é SOFT_STARTER."""
    projeto = criar_projeto(nome="SS2", codigo="19002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M2",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.DIRETA,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    p = Produto.objects.create(
        codigo="SS-02",
        descricao="S",
        categoria=CategoriaProdutoNomeChoices.SOFT_STARTER,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=p,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
        quantidade=Decimal("1"),
        ordem=45,
    )
    assert processar_sugestao_soft_starter_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_soft_starter_tensao_projeto_diferente_motor_pendencia(
    criar_projeto, criar_carga_motor
):
    projeto = criar_projeto(nome="SS3", codigo="19003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M3",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.SOFT_STARTER,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    # Simula divergência já persistida (validação do modelo impede criar assim diretamente).
    CargaMotor.objects.filter(carga=carga).update(tensao_motor=TensaoChoices.V220)

    assert processar_sugestao_soft_starter_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.SOFT_STARTER,
    ).exists()


@pytest.mark.django_db
def test_soft_starter_selector_vazio_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="SS4", codigo="19004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.SOFT_STARTER,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("50"),
    )
    with patch(
        "composicao_painel.services.sugestoes.soft_starter.selecionar_soft_starters",
        return_value=Produto.objects.none(),
    ):
        assert processar_sugestao_soft_starter_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_reprocessar_soft_starter(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="SS5", codigo="19005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.SOFT_STARTER,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("5"),
    )
    p = Produto.objects.create(
        codigo="SS-05",
        descricao="Soft",
        categoria=CategoriaProdutoNomeChoices.SOFT_STARTER,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoSoftStarter.objects.create(
        produto=p,
        corrente_nominal_a=Decimal("10"),
        tensao_nominal_v=TensaoChoices.V380,
        tipo_montagem=ModoMontagemChoices.PLACA,
    )
    assert reprocessar_soft_starter_para_carga(projeto, carga) is not None


@pytest.mark.django_db
def test_gerar_sugestoes_soft_starters_itera(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="SS6", codigo="19006-26", tensao_nominal=TensaoChoices.V380)
    p = Produto.objects.create(
        codigo="SS-06",
        descricao="Soft",
        categoria=CategoriaProdutoNomeChoices.SOFT_STARTER,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoSoftStarter.objects.create(
        produto=p,
        corrente_nominal_a=Decimal("100"),
        tensao_nominal_v=TensaoChoices.V380,
        tipo_montagem=ModoMontagemChoices.PLACA,
    )
    for tag in ("A", "B"):
        carga = Carga.objects.create(
            projeto=projeto,
            tag=tag,
            descricao="M",
            tipo=TipoCargaChoices.MOTOR,
        )
        criar_carga_motor(
            carga=carga,
            tensao_motor=TensaoChoices.V380,
            tipo_partida=TipoPartidaMotorChoices.SOFT_STARTER,
            numero_fases=NumeroFasesChoices.TRIFASICO,
            potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
            potencia_corrente_valor=Decimal("10"),
        )
    out = gerar_sugestoes_soft_starters(projeto)
    assert len(out) == 2


@pytest.mark.django_db
def test_projeto_tem_motor_soft_starter_trifasico(criar_projeto, criar_carga_motor):
    from composicao_painel.services.sugestoes.orquestrador import (
        projeto_tem_motor_soft_starter_trifasico,
    )

    projeto = criar_projeto(nome="SS7", codigo="19007-26", tensao_nominal=TensaoChoices.V380)
    assert projeto_tem_motor_soft_starter_trifasico(projeto) is False

    carga = Carga.objects.create(
        projeto=projeto,
        tag="MX",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.SOFT_STARTER,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    assert projeto_tem_motor_soft_starter_trifasico(projeto) is True
