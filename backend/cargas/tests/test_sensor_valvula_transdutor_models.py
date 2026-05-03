from decimal import Decimal
from types import SimpleNamespace

import pytest
from django.core.exceptions import ValidationError

from cargas.models.sensor import CargaSensor
from cargas.models.transdutor import CargaTransdutor
from cargas.models.valvula import CargaValvula
from core.choices import (
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoReleInterfaceValvulaChoices,
    TipoSinalChoices,
)


def test_sensor_clean_rejeita_pnp_e_npn_simultaneos():
    sensor = SimpleNamespace(
        carga=SimpleNamespace(tipo=TipoCargaChoices.SENSOR),
        pnp=True,
        npn=True,
        normalmente_aberto=False,
        normalmente_fechado=False,
        tipo_sinal=TipoSinalChoices.DIGITAL,
        tipo_sinal_analogico=None,
    )
    with pytest.raises(ValidationError) as exc:
        CargaSensor.clean(sensor)
    assert "pnp" in exc.value.message_dict
    assert "npn" in exc.value.message_dict


def test_sensor_clean_analogico_exige_tipo_sinal_analogico():
    sensor = SimpleNamespace(
        carga=SimpleNamespace(tipo=TipoCargaChoices.SENSOR),
        pnp=False,
        npn=False,
        normalmente_aberto=False,
        normalmente_fechado=False,
        tipo_sinal=TipoSinalChoices.ANALOGICO,
        tipo_sinal_analogico=None,
    )
    with pytest.raises(ValidationError) as exc:
        CargaSensor.clean(sensor)
    assert "tipo_sinal_analogico" in exc.value.message_dict


def test_valvula_clean_rejeita_corrente_negativa_e_solenoides_invalidos():
    valvula = SimpleNamespace(
        carga=SimpleNamespace(tipo=TipoCargaChoices.VALVULA),
        corrente_consumida_ma=Decimal("-1.0"),
        quantidade_solenoides=0,
        tipo_acionamento=TipoAcionamentoValvulaChoices.SOLENOIDE_DIRETO,
        tipo_rele_interface=None,
    )
    with pytest.raises(ValidationError) as exc:
        CargaValvula.clean(valvula)
    assert "corrente_consumida_ma" in exc.value.message_dict
    assert "quantidade_solenoides" in exc.value.message_dict


def test_valvula_clean_rele_interface_exige_tipo():
    valvula = SimpleNamespace(
        carga=SimpleNamespace(tipo=TipoCargaChoices.VALVULA),
        corrente_consumida_ma=Decimal("200"),
        quantidade_solenoides=1,
        tipo_acionamento=TipoAcionamentoValvulaChoices.RELE_INTERFACE,
        tipo_rele_interface=None,
    )
    with pytest.raises(ValidationError) as exc:
        CargaValvula.clean(valvula)
    assert "tipo_rele_interface" in exc.value.message_dict


def test_valvula_clean_tipo_interface_apenas_com_rele():
    valvula = SimpleNamespace(
        carga=SimpleNamespace(tipo=TipoCargaChoices.VALVULA),
        corrente_consumida_ma=Decimal("200"),
        quantidade_solenoides=1,
        tipo_acionamento=TipoAcionamentoValvulaChoices.CONTATOR,
        tipo_rele_interface=TipoReleInterfaceValvulaChoices.ELETROMECANICA,
    )
    with pytest.raises(ValidationError) as exc:
        CargaValvula.clean(valvula)
    assert "tipo_rele_interface" in exc.value.message_dict


def test_transdutor_clean_exige_tipo_sinal_analogico():
    transdutor = SimpleNamespace(
        carga=SimpleNamespace(tipo=TipoCargaChoices.TRANSDUTOR),
        tipo_sinal_analogico=None,
    )
    with pytest.raises(ValidationError) as exc:
        CargaTransdutor.clean(transdutor)
    assert "tipo_sinal_analogico" in exc.value.message_dict
