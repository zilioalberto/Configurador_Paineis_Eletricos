from decimal import Decimal
from math import sqrt
from types import SimpleNamespace

import pytest

from cargas.models import Carga, CargaMotor
from core.choices import (
    NumeroFasesChoices,
    TipoCargaChoices,
    TipoPartidaMotorChoices,
    TensaoChoices,
    UnidadePotenciaCorrenteChoices,
)
from projetos.services.tensao_nominal_dependentes import (
    _alinhar_tensao_motor_com_projeto,
    _escalar_entrada_ampere_motores,
    reiniciar_dependentes_apos_alteracao_tensao_nominal,
)


@pytest.mark.django_db
def test_escala_entrada_ampere_quando_tensao_projeto_muda(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="P", codigo="07001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        potencia_corrente_valor=Decimal("10.00"),
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        tensao_motor=TensaoChoices.V380,
    )

    projeto.tensao_nominal = TensaoChoices.V220
    projeto.save()

    reiniciar_dependentes_apos_alteracao_tensao_nominal(
        projeto,
        tensao_nominal_anterior=TensaoChoices.V380,
    )

    motor = CargaMotor.objects.get(carga=carga)
    esperado = (Decimal("10.00") * Decimal("380") / Decimal("220")).quantize(Decimal("0.01"))
    assert motor.potencia_corrente_valor == esperado
    assert motor.corrente_calculada_a == esperado


def test_escalar_ampere_sem_mudanca_de_tensao_nao_altera():
    motor = SimpleNamespace(
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("10.00"),
    )
    _escalar_entrada_ampere_motores([motor], 380, 380)
    assert motor.potencia_corrente_valor == Decimal("10.00")


def test_escalar_ampere_tensao_anterior_none_nao_altera():
    motor = SimpleNamespace(
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("10.00"),
    )
    _escalar_entrada_ampere_motores([motor], None, 220)
    assert motor.potencia_corrente_valor == Decimal("10.00")


def test_escalar_ampere_tensao_nova_zero_nao_altera():
    motor = SimpleNamespace(
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.A,
        potencia_corrente_valor=Decimal("10.00"),
    )
    _escalar_entrada_ampere_motores([motor], 380, 0)
    assert motor.potencia_corrente_valor == Decimal("10.00")


def test_escalar_nao_ampere_nao_escala_mesmo_com_mudanca_tensao():
    motor = SimpleNamespace(
        potencia_corrente_unidade=UnidadePotenciaCorrenteChoices.CV,
        potencia_corrente_valor=Decimal("5.00"),
    )
    _escalar_entrada_ampere_motores([motor], 380, 220)
    assert motor.potencia_corrente_valor == Decimal("5.00")


def test_alinhar_tensao_sem_tensao_projeto_nao_altera():
    motor = SimpleNamespace(
        tipo_partida=TipoPartidaMotorChoices.DIRETA,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_motor=380,
    )
    _alinhar_tensao_motor_com_projeto(motor, None)
    assert motor.tensao_motor == 380


def test_alinhar_tensao_partida_inversor_nao_segue_projeto():
    motor = SimpleNamespace(
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_motor=380,
    )
    _alinhar_tensao_motor_com_projeto(motor, 220)
    assert motor.tensao_motor == 380


def test_alinhar_tensao_monofasico_usa_fase_fase_sobre_raiz3():
    motor = SimpleNamespace(
        tipo_partida=TipoPartidaMotorChoices.DIRETA,
        numero_fases=NumeroFasesChoices.MONOFASICO,
        tensao_motor=380,
    )
    _alinhar_tensao_motor_com_projeto(motor, 220)
    assert motor.tensao_motor == int(round(220 / sqrt(3)))


def test_alinhar_tensao_trifasico_igual_projeto():
    motor = SimpleNamespace(
        tipo_partida=TipoPartidaMotorChoices.DIRETA,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_motor=380,
    )
    _alinhar_tensao_motor_com_projeto(motor, 220)
    assert motor.tensao_motor == 220
