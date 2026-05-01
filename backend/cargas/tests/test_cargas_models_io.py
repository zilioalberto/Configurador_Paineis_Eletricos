from decimal import Decimal
from types import SimpleNamespace

import pytest
from django.core.exceptions import ValidationError
from unittest.mock import patch

from cargas.models import Carga, CargaResistencia, CargaSensor, CargaTransdutor, CargaValvula
from core.choices import (
    NumeroFasesChoices,
    TensaoChoices,
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
    TipoCorrenteChoices,
    TipoProtecaoResistenciaChoices,
    TipoSensorChoices,
    TipoSinalChoices,
    TipoSinaisAnalogicosChoices,
    TipoTransdutorChoices,
    TipoValvulaChoices,
)


@pytest.mark.django_db
def test_resistencia_save_sincroniza_saida_digital_com_plc(criar_projeto):
    projeto = criar_projeto(
        nome="RIO1",
        codigo="17001-26",
        tensao_nominal=TensaoChoices.V380,
        possui_plc=True,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R1",
        descricao="Res",
        tipo=TipoCargaChoices.RESISTENCIA,
        exige_comando=True,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
        potencia_kw=Decimal("1.500"),
    )
    carga.refresh_from_db()
    assert carga.quantidade_saidas_digitais == 1


@pytest.mark.django_db
def test_resistencia_save_sem_plc_zerado(criar_projeto):
    projeto = criar_projeto(
        nome="RIO2",
        codigo="17002-26",
        tensao_nominal=TensaoChoices.V380,
        possui_plc=False,
    )
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
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("1.000"),
    )
    carga.refresh_from_db()
    assert carga.quantidade_saidas_digitais == 0


def test_sensor_digital_encoder_ocupa_digital_e_rapida():
    carga = SimpleNamespace(
        projeto=SimpleNamespace(possui_plc=True),
        quantidade_entradas_digitais=0,
        quantidade_entradas_analogicas=0,
        quantidade_saidas_digitais=0,
        quantidade_saidas_analogicas=0,
        quantidade_entradas_rapidas=0,
    )
    sensor = SimpleNamespace(
        carga=carga,
        tipo_sinal=TipoSinalChoices.DIGITAL,
        tipo_sensor=TipoSensorChoices.ENCODER,
    )
    with patch("cargas.models.sensor.reset_io_flags") as reset_io, patch(
        "cargas.models.sensor.save_io_flags"
    ) as save_io:
        CargaSensor.sincronizar_quantidades_carga(sensor)
    reset_io.assert_called_once_with(carga)
    save_io.assert_called_once_with(carga)
    assert carga.quantidade_entradas_digitais == 1
    assert carga.quantidade_entradas_rapidas == 1


def test_sensor_analogico_ocupa_entrada_analogica():
    carga = SimpleNamespace(
        projeto=SimpleNamespace(possui_plc=True),
        quantidade_entradas_digitais=0,
        quantidade_entradas_analogicas=0,
        quantidade_saidas_digitais=0,
        quantidade_saidas_analogicas=0,
        quantidade_entradas_rapidas=0,
    )
    sensor = SimpleNamespace(
        carga=carga,
        tipo_sinal=TipoSinalChoices.ANALOGICO,
        tipo_sensor=TipoSensorChoices.INDUTIVO,
    )
    with patch("cargas.models.sensor.reset_io_flags"), patch(
        "cargas.models.sensor.save_io_flags"
    ):
        CargaSensor.sincronizar_quantidades_carga(sensor)
    assert carga.quantidade_entradas_analogicas == 1


@pytest.mark.django_db
def test_valvula_save_sincroniza_saida_e_feedback(criar_projeto):
    projeto = criar_projeto(
        nome="VIO1",
        codigo="17005-26",
        tensao_nominal=TensaoChoices.V380,
        possui_plc=True,
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="V1",
        descricao="Valvula",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        tipo_valvula=TipoValvulaChoices.SOLENOIDE,
        quantidade_solenoides=2,
        possui_feedback=True,
        tensao_alimentacao=TensaoChoices.V24,
        tipo_corrente=TipoCorrenteChoices.CC,
        corrente_consumida_ma=Decimal("200.00"),
    )
    carga.refresh_from_db()
    assert carga.quantidade_saidas_digitais == 2
    assert carga.quantidade_entradas_digitais == 1


def test_transdutor_sincroniza_entrada_analogica():
    carga = SimpleNamespace(
        projeto=SimpleNamespace(possui_plc=True),
        quantidade_entradas_digitais=0,
        quantidade_entradas_analogicas=0,
        quantidade_saidas_digitais=0,
        quantidade_saidas_analogicas=0,
        quantidade_entradas_rapidas=0,
    )
    transdutor = SimpleNamespace(carga=carga)
    with patch("cargas.models.transdutor.reset_io_flags"), patch(
        "cargas.models.transdutor.save_io_flags"
    ):
        CargaTransdutor.sincronizar_quantidades_carga(transdutor)
    assert carga.quantidade_entradas_analogicas == 1


def test_resistencia_clean_rejeita_numero_fases_invalido():
    fake = SimpleNamespace(
        carga=SimpleNamespace(tipo=TipoCargaChoices.RESISTENCIA, projeto=None),
        numero_fases=999,
        tensao_resistencia=TensaoChoices.V380,
        potencia_kw=Decimal("1.0"),
    )
    with pytest.raises(ValidationError) as exc:
        CargaResistencia.clean(fake)
    assert "numero_fases" in exc.value.message_dict

