from decimal import Decimal
from unittest.mock import patch

import pytest

from cargas.models import Carga
from catalogo.models import EspecificacaoInversorFrequencia, Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.inversores_frequencia import (
    gerar_sugestoes_inversores_frequencia,
    processar_sugestao_inversores_frequencia_para_carga,
    reprocessar_inversores_frequencia_para_carga,
)
from composicao_painel.services.sugestoes.orquestrador import (
    montar_etapas_geracao,
    projeto_tem_motor_inversor_frequencia,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    TensaoChoices,
    UnidadePotenciaCorrenteChoices,
)
from core.choices.cargas import TipoCargaChoices, TipoPartidaMotorChoices
from core.choices.produtos import NumeroFasesInversorFrequenciaChoices, UnidadeMedidaChoices


@pytest.mark.django_db
def test_inversor_igual_tensao_projeto_motor(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IF1", codigo="19011-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("10"),
    )
    p = Produto.objects.create(
        codigo="IF-01",
        descricao="Inversor",
        categoria=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoInversorFrequencia.objects.create(
        produto=p,
        potencia_nominal_kw=Decimal("5"),
        corrente_nominal_a=Decimal("20"),
        tensao_entrada_v=TensaoChoices.V380,
        tensao_saida_v=TensaoChoices.V380,
        numero_fases_entrada=NumeroFasesInversorFrequenciaChoices.F3,
    )
    sug = processar_sugestao_inversores_frequencia_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p.id
    assert sug.categoria_produto == CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA
    assert sug.parte_painel == PartesPainelChoices.ACIONAMENTO_CARGA


@pytest.mark.django_db
def test_inversor_motor_trif_220_rede_380_entrada_220_1f(criar_projeto, criar_carga_motor):
    """Rede 380 V + motor trifásico 220 V: catálogo com entrada 220 V monofásica (1F)."""
    projeto = criar_projeto(nome="IF2", codigo="19012-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M2",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V220,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("8"),
    )
    p_errado = Produto.objects.create(
        codigo="IF-380-3F",
        descricao="Inv entrada 380 3F",
        categoria=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoInversorFrequencia.objects.create(
        produto=p_errado,
        potencia_nominal_kw=Decimal("5"),
        corrente_nominal_a=Decimal("20"),
        tensao_entrada_v=TensaoChoices.V380,
        tensao_saida_v=TensaoChoices.V220,
        numero_fases_entrada=NumeroFasesInversorFrequenciaChoices.F3,
    )
    p_ok = Produto.objects.create(
        codigo="IF-220-1F",
        descricao="Inv entrada 220 1F",
        categoria=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoInversorFrequencia.objects.create(
        produto=p_ok,
        potencia_nominal_kw=Decimal("5"),
        corrente_nominal_a=Decimal("20"),
        tensao_entrada_v=TensaoChoices.V220,
        tensao_saida_v=TensaoChoices.V220,
        numero_fases_entrada=NumeroFasesInversorFrequenciaChoices.F1,
    )
    sug = processar_sugestao_inversores_frequencia_para_carga(projeto, carga)
    assert sug is not None
    assert sug.produto_id == p_ok.id


@pytest.mark.django_db
def test_inversor_tensao_fora_das_regras_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IF3", codigo="19013-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M3",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V110,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("5"),
    )
    assert processar_sugestao_inversores_frequencia_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
    ).exists()


@pytest.mark.django_db
def test_inversor_selector_vazio_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IF4", codigo="19014-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("50"),
    )
    with patch(
        "composicao_painel.services.sugestoes.inversores_frequencia.selecionar_inversores_frequencia",
        return_value=Produto.objects.none(),
    ):
        assert processar_sugestao_inversores_frequencia_para_carga(projeto, carga) is None
    assert PendenciaItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_reprocessar_inversor_frequencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IF5", codigo="19015-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("5"),
    )
    p = Produto.objects.create(
        codigo="IF-05",
        descricao="Inv",
        categoria=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoInversorFrequencia.objects.create(
        produto=p,
        potencia_nominal_kw=Decimal("3"),
        corrente_nominal_a=Decimal("10"),
        tensao_entrada_v=TensaoChoices.V380,
        tensao_saida_v=TensaoChoices.V380,
        numero_fases_entrada=NumeroFasesInversorFrequenciaChoices.F3,
    )
    assert reprocessar_inversores_frequencia_para_carga(projeto, carga) is not None


@pytest.mark.django_db
def test_gerar_inversores_frequencia_itera_cargas(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IF6", codigo="19016-26", tensao_nominal=TensaoChoices.V380)
    p = Produto.objects.create(
        codigo="IF-06",
        descricao="Inv",
        categoria=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoInversorFrequencia.objects.create(
        produto=p,
        potencia_nominal_kw=Decimal("10"),
        corrente_nominal_a=Decimal("100"),
        tensao_entrada_v=TensaoChoices.V380,
        tensao_saida_v=TensaoChoices.V380,
        numero_fases_entrada=NumeroFasesInversorFrequenciaChoices.F3,
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
            tipo_partida=TipoPartidaMotorChoices.INVERSOR,
            potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
            potencia_corrente_valor=Decimal("10"),
        )
    out = gerar_sugestoes_inversores_frequencia(projeto)
    assert len(out) == 2


@pytest.mark.django_db
def test_projeto_tem_motor_inversor_frequencia_flag(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IF7", codigo="19017-26", tensao_nominal=TensaoChoices.V380)
    assert projeto_tem_motor_inversor_frequencia(projeto) is False

    carga = Carga.objects.create(
        projeto=projeto,
        tag="MX",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
    )
    assert projeto_tem_motor_inversor_frequencia(projeto) is True


@pytest.mark.django_db
def test_inversor_partida_direta_limpa_escopo(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IF8", codigo="19018-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M8",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.DIRETA,
    )
    p = Produto.objects.create(
        codigo="IF-08",
        descricao="I",
        categoria=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=p,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.INVERSOR_FREQUENCIA,
        quantidade=Decimal("1"),
        ordem=46,
    )
    assert processar_sugestao_inversores_frequencia_para_carga(projeto, carga) is None
    assert not SugestaoItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_montar_etapas_inclui_inversor_frequencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IF9", codigo="19019-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M9",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
    )
    nomes = [n for n, _ in montar_etapas_geracao(projeto)]
    assert "INVERSOR_FREQUENCIA" in nomes
