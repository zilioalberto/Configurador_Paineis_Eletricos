from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.core.exceptions import ValidationError as DjangoValidationError

from cargas.api.serializers import (
    CargaDetailSerializer,
    CargaListSerializer,
    CargaModeloSerializer,
    CargaWriteSerializer,
    _default_spec_payload,
    _merge_spec,
)
from cargas.models import (
    Carga,
    CargaMotor,
    CargaResistencia,
    CargaSensor,
    CargaTransdutor,
    CargaValvula,
)
from core.choices import TensaoChoices, TipoSinalChoices
from core.choices.cargas import TipoCargaChoices


def test_default_spec_payload_e_merge_spec_helpers():
    assert _default_spec_payload(TipoCargaChoices.TRANSMISSOR) == {}
    motor_defaults = _default_spec_payload(TipoCargaChoices.MOTOR)
    assert motor_defaults["potencia_corrente_unidade"] == "CV"
    merged = _merge_spec({"a": 1, "b": 2}, {"b": None, "c": 3})
    assert merged == {"a": 1, "b": 2, "c": 3}


@pytest.mark.django_db
def test_carga_list_serializer_sem_nested_retorna_fallbacks(criar_projeto):
    projeto = criar_projeto(nome="SL1", codigo="18001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M0",
        descricao="Motor sem nested",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )
    row = CargaListSerializer(carga).data
    assert row["corrente_calculada_a"] is None
    assert row["potencia_corrente_valor"] is None
    assert row["potencia_corrente_unidade"] is None
    assert row["fases_carga_display"] is None
    assert row["tensao_carga_display"] == "380 V"


@pytest.mark.django_db
def test_carga_detail_serializer_retorna_nested_none_quando_inexistente(criar_projeto):
    projeto = criar_projeto(nome="SD1", codigo="18002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S0",
        descricao="Sensor sem nested",
        tipo=TipoCargaChoices.SENSOR,
        quantidade=1,
    )
    data = CargaDetailSerializer(carga).data
    assert data["sensor"] is None
    assert data["motor"] is None
    assert data["valvula"] is None
    assert data["resistencia"] is None
    assert data["transdutor"] is None


@pytest.mark.django_db
def test_carga_write_validate_sensor_analogico_sem_tipo_analogico(criar_projeto):
    projeto = criar_projeto(nome="SVA", codigo="18005-26", tensao_nominal=TensaoChoices.V380)
    ser = CargaWriteSerializer(
        data={
            "projeto": str(projeto.id),
            "tag": "S1",
            "descricao": "Sensor",
            "tipo": TipoCargaChoices.SENSOR,
            "quantidade": 1,
            "sensor": {
                "tipo_sensor": "INDUTIVO",
                "tipo_sinal": TipoSinalChoices.ANALOGICO,
                "tipo_sinal_analogico": "",
            },
        }
    )
    assert not ser.is_valid()
    assert "sensor" in ser.errors


@pytest.mark.django_db
def test_carga_write_create_spec_traduz_django_validation_error(criar_projeto):
    projeto = criar_projeto(nome="SW1", codigo="18003-26", tensao_nominal=TensaoChoices.V380)
    ser = CargaWriteSerializer(
        data={
            "projeto": str(projeto.id),
            "tag": "M9",
            "descricao": "Motor",
            "tipo": TipoCargaChoices.MOTOR,
            "quantidade": 1,
            "motor": {"potencia_corrente_valor": "1.00", "tensao_motor": 380},
        }
    )
    assert ser.is_valid(), ser.errors
    with patch(
        "cargas.api.serializers.CargaMotor.objects.create",
        side_effect=DjangoValidationError({"tensao_motor": ["inválida"]}),
    ):
        with pytest.raises(Exception) as exc:
            ser.save()
    assert "motor" in str(exc.value).lower()


@pytest.mark.django_db
def test_carga_write_update_mesmo_tipo_atualiza_nested_existente(criar_projeto):
    projeto = criar_projeto(nome="SW2", codigo="18004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M2",
        descricao="Motor",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )
    CargaMotor.objects.create(
        carga=carga,
        potencia_corrente_valor="1.00",
        potencia_corrente_unidade="CV",
        tensao_motor=380,
    )
    ser = CargaWriteSerializer(
        instance=carga,
        data={
            "descricao": "Motor atualizado",
            "motor": {"tipo_partida": "SOFT_STARTER"},
        },
        partial=True,
    )
    assert ser.is_valid(), ser.errors
    out = ser.save()
    out.refresh_from_db()
    assert out.motor.tipo_partida == "SOFT_STARTER"


@pytest.mark.django_db
def test_carga_modelo_serializer_validate_payload_non_dict():
    ser = CargaModeloSerializer(
        data={
            "nome": "Inválido",
            "tipo": TipoCargaChoices.MOTOR,
            "payload": [],
            "ativo": True,
        }
    )
    assert not ser.is_valid()
    assert "payload" in ser.errors


class _ObjSemNested:
    def __init__(self, tipo: str, projeto):
        self.tipo = tipo
        self.projeto = projeto

    @property
    def valvula(self):
        raise CargaValvula.DoesNotExist

    @property
    def sensor(self):
        raise CargaSensor.DoesNotExist

    @property
    def transdutor(self):
        raise CargaTransdutor.DoesNotExist

    @property
    def motor(self):
        raise CargaMotor.DoesNotExist

    @property
    def resistencia(self):
        raise CargaResistencia.DoesNotExist


def test_carga_list_serializer_getters_para_valvula_sensor_transdutor():
    ser = CargaListSerializer()
    projeto = SimpleNamespace(
        tensao_nominal=380,
        get_tipo_corrente_display=lambda: "Corrente contínua (CC)",
    )
    obj_valvula = SimpleNamespace(
        tipo=TipoCargaChoices.VALVULA,
        projeto=projeto,
        valvula=SimpleNamespace(
            corrente_consumida_ma=Decimal("200.00"),
            tensao_alimentacao=24,
            get_tipo_corrente_display=lambda: "CC",
        ),
    )
    assert str(ser.get_corrente_calculada_a(obj_valvula)) == "0.200"
    assert str(ser.get_potencia_corrente_valor(obj_valvula)) == "4.80"
    assert ser.get_potencia_corrente_unidade(obj_valvula) == "W"
    assert ser.get_tensao_carga_display(obj_valvula) == "24 V"
    assert ser.get_tipo_corrente_carga_display(obj_valvula) == "CC"

    obj_sensor = SimpleNamespace(
        tipo=TipoCargaChoices.SENSOR,
        projeto=projeto,
        sensor=SimpleNamespace(
            corrente_consumida_ma=Decimal("10.00"),
            tensao_alimentacao=24,
            get_tipo_corrente_display=lambda: "CC",
        ),
    )
    assert str(ser.get_corrente_calculada_a(obj_sensor)) == "0.010"
    assert str(ser.get_potencia_corrente_valor(obj_sensor)) == "0.24"

    obj_transdutor = SimpleNamespace(
        tipo=TipoCargaChoices.TRANSDUTOR,
        projeto=projeto,
        transdutor=SimpleNamespace(
            corrente_consumida_ma=Decimal("20.00"),
            tensao_alimentacao=24,
            get_tipo_corrente_display=lambda: "CC",
        ),
    )
    assert str(ser.get_corrente_calculada_a(obj_transdutor)) == "0.020"
    assert str(ser.get_potencia_corrente_valor(obj_transdutor)) == "0.48"


def test_carga_list_serializer_getters_fallback_quando_nested_inexistente():
    ser = CargaListSerializer()
    projeto = SimpleNamespace(
        tensao_nominal=220,
        get_tipo_corrente_display=lambda: "CA",
    )
    obj = _ObjSemNested(TipoCargaChoices.VALVULA, projeto)
    assert ser.get_corrente_calculada_a(obj) is None
    assert ser.get_potencia_corrente_valor(obj) is None
    assert ser.get_tensao_carga_display(obj) == "220 V"
    assert ser.get_tipo_corrente_carga_display(obj) == "CA"


def test_carga_detail_serializer_get_nesteds_com_e_sem_dados():
    ser = CargaDetailSerializer()
    obj_ok = SimpleNamespace(
        tipo=TipoCargaChoices.TRANSDUTOR,
        transdutor=SimpleNamespace(tipo_transdutor="PRESSAO"),
    )
    data = ser.get_transdutor(obj_ok)
    assert data["tipo_transdutor"] == "PRESSAO"

    obj_sem = _ObjSemNested(TipoCargaChoices.TRANSDUTOR, SimpleNamespace())
    assert ser.get_transdutor(obj_sem) is None
