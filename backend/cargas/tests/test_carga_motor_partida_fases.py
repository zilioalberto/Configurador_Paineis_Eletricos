"""Regras de partida (inversor / soft starter) vs número de fases do motor."""

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from cargas.models import Carga, CargaMotor
from core.choices import NumeroFasesChoices, TensaoChoices, UnidadePotenciaCorrenteChoices
from core.choices.cargas import TipoCargaChoices, TipoPartidaMotorChoices


@pytest.mark.django_db
def test_motor_monofasico_nao_permite_inversor(criar_projeto):
    projeto = criar_projeto(nome="MF", codigo="21001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    m = CargaMotor(
        carga=carga,
        potencia_corrente_valor=Decimal("1.00"),
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.CV,
        numero_fases=NumeroFasesChoices.MONOFASICO,
        tensao_motor=TensaoChoices.V220,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
    )
    with pytest.raises(ValidationError) as exc:
        m.full_clean()
    assert "tipo_partida" in exc.value.message_dict


@pytest.mark.django_db
def test_motor_monofasico_nao_permite_soft_starter(criar_projeto):
    projeto = criar_projeto(nome="MF2", codigo="21002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M2",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    m = CargaMotor(
        carga=carga,
        potencia_corrente_valor=Decimal("1.00"),
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.CV,
        numero_fases=NumeroFasesChoices.MONOFASICO,
        tensao_motor=TensaoChoices.V220,
        tipo_partida=TipoPartidaMotorChoices.SOFT_STARTER,
    )
    with pytest.raises(ValidationError) as exc:
        m.full_clean()
    assert "tipo_partida" in exc.value.message_dict


@pytest.mark.django_db
def test_motor_trifasico_inversor_valido(criar_projeto):
    projeto = criar_projeto(nome="MF3", codigo="21003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M3",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    m = CargaMotor(
        carga=carga,
        potencia_corrente_valor=Decimal("1.00"),
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.CV,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_motor=TensaoChoices.V220,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
    )
    m.full_clean()
