"""Serviço de dimensionamento de circuitos por carga."""

from decimal import Decimal

import pytest

from cargas.models import Carga, CargaMotor, CargaSensor, CargaValvula
from core.choices import NumeroFasesChoices, TipoCargaChoices, TipoCorrenteChoices, TipoSinalChoices
from core.choices.eletrica import TensaoChoices
from dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from dimensionamento.services.circuitos import calcular_e_salvar_circuitos_cargas


@pytest.mark.django_db
def test_motor_trifasico_dimensiona_tres_fases_e_pe(criar_projeto):
    projeto = criar_projeto(nome="X", codigo="51001-26", tensao_nominal=TensaoChoices.V380)
    projeto.fator_demanda = Decimal("1.00")
    projeto.save(update_fields=["fator_demanda"])

    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="MOTOR",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )
    CargaMotor.objects.create(
        carga=carga,
        potencia_corrente_valor="10.00",
        potencia_corrente_unidade="A",
        tensao_motor=380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )

    n = calcular_e_salvar_circuitos_cargas(projeto)
    assert n == 1

    d = DimensionamentoCircuitoCarga.objects.get(carga=carga)
    assert d.quantidade_condutores_fase == 3
    assert d.possui_neutro is False
    assert d.possui_pe is True
    assert d.secao_condutor_neutro_mm2 is None
    assert d.secao_condutor_fase_mm2 is not None
    assert d.secao_condutor_pe_mm2 is not None
    assert d.corrente_projeto_a is not None


@pytest.mark.django_db
def test_sensor_digital_um_mm2_sem_pe(criar_projeto):
    projeto = criar_projeto(nome="Y", codigo="51002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S01",
        descricao="SENSOR",
        tipo=TipoCargaChoices.SENSOR,
        quantidade=1,
    )
    CargaSensor.objects.create(
        carga=carga,
        tipo_sensor="INDUTIVO",
        tipo_sinal=TipoSinalChoices.DIGITAL,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
    )

    calcular_e_salvar_circuitos_cargas(projeto)
    d = DimensionamentoCircuitoCarga.objects.get(carga=carga)
    assert d.quantidade_condutores_sinal == 3
    assert d.secao_condutor_fase_mm2 == Decimal("1.00")
    assert d.possui_pe is False


@pytest.mark.django_db
def test_valvula_cc_fixo_dois_condutores(criar_projeto):
    projeto = criar_projeto(nome="Z", codigo="51003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="V01",
        descricao="VAL",
        tipo=TipoCargaChoices.VALVULA,
        quantidade=1,
    )
    CargaValvula.objects.create(
        carga=carga,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
    )

    calcular_e_salvar_circuitos_cargas(projeto)
    d = DimensionamentoCircuitoCarga.objects.get(carga=carga)
    assert d.quantidade_condutores_fase == 2
    assert d.secao_condutor_fase_mm2 == Decimal("1.00")
    assert d.possui_neutro is False


@pytest.mark.django_db
def test_alimentacao_geral_trifasica_usa_resumo_e_projeto(criar_projeto):
    projeto = criar_projeto(
        nome="AG",
        codigo="52001-26",
        tensao_nominal=TensaoChoices.V380,
    )
    projeto.numero_fases = NumeroFasesChoices.TRIFASICO
    projeto.possui_neutro = True
    projeto.possui_terra = True
    projeto.save(update_fields=["numero_fases", "possui_neutro", "possui_terra"])

    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    resumo.corrente_total_painel_a = Decimal("50.00")
    resumo.save(update_fields=["corrente_total_painel_a"])

    calcular_e_salvar_circuitos_cargas(projeto, resumo)
    ag = DimensionamentoCircuitoAlimentacaoGeral.objects.get(projeto=projeto)
    assert ag.corrente_total_painel_a == Decimal("50.00")
    assert ag.quantidade_condutores_fase == 3
    assert ag.quantidade_condutores_neutro == 1
    assert ag.possui_neutro is True
    assert ag.possui_terra is True
    assert ag.secao_condutor_fase_mm2 is not None
    assert ag.secao_condutor_pe_mm2 is not None
