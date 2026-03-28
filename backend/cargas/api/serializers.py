from decimal import Decimal

from django.db import transaction
from rest_framework import serializers

from cargas.models import (
    Carga,
    CargaMotor,
    CargaResistencia,
    CargaSensor,
    CargaTransdutor,
    CargaValvula,
)
from core.choices import TipoCargaChoices, TipoSinalChoices

NESTED_KEYS = ("motor", "valvula", "resistencia", "sensor", "transdutor")

TIPO_TO_KEY = {
    TipoCargaChoices.MOTOR: "motor",
    TipoCargaChoices.VALVULA: "valvula",
    TipoCargaChoices.RESISTENCIA: "resistencia",
    TipoCargaChoices.SENSOR: "sensor",
    TipoCargaChoices.TRANSDUTOR: "transdutor",
    TipoCargaChoices.TRANSMISSOR: None,
    TipoCargaChoices.OUTRO: None,
}

MODEL_BY_KEY = {
    "motor": CargaMotor,
    "valvula": CargaValvula,
    "resistencia": CargaResistencia,
    "sensor": CargaSensor,
    "transdutor": CargaTransdutor,
}


def _default_spec_payload(tipo: str) -> dict:
    if tipo == TipoCargaChoices.MOTOR:
        return {
            "potencia_corrente_valor": Decimal("1.00"),
            "potencia_corrente_unidade": "CV",
            "rendimento_percentual": Decimal("85.00"),
            "fator_potencia": Decimal("0.85"),
            "tipo_partida": "DIRETA",
            "tipo_protecao": "DISJUNTOR_MOTOR",
            "reversivel": False,
            "freio_motor": False,
            "tipo_conexao_painel": "CONEXAO_BORNES_COM_PE",
            "tempo_partida_s": None,
        }
    if tipo == TipoCargaChoices.VALVULA:
        return {
            "tipo_valvula": "SOLENOIDE",
            "quantidade_vias": None,
            "quantidade_posicoes": None,
            "retorno_mola": False,
            "possui_feedback": False,
        }
    if tipo == TipoCargaChoices.RESISTENCIA:
        return {
            "controle_em_etapas": False,
            "quantidade_etapas": 1,
            "controle_pid": False,
        }
    if tipo == TipoCargaChoices.SENSOR:
        return {
            "tipo_sensor": "INDUTIVO",
            "tipo_sinal": TipoSinalChoices.DIGITAL,
            "tipo_sinal_analogico": None,
            "pnp": False,
            "npn": False,
            "normalmente_aberto": False,
            "normalmente_fechado": False,
            "range_medicao": "",
        }
    if tipo == TipoCargaChoices.TRANSDUTOR:
        return {
            "tipo_transdutor": "PRESSAO",
            "faixa_medicao": "",
            "tipo_sinal_analogico": "CORRENTE_4_20MA",
            "precisao": "",
        }
    return {}


def _clear_specs(carga: Carga) -> None:
    CargaMotor.objects.filter(carga=carga).delete()
    CargaValvula.objects.filter(carga=carga).delete()
    CargaResistencia.objects.filter(carga=carga).delete()
    CargaSensor.objects.filter(carga=carga).delete()
    CargaTransdutor.objects.filter(carga=carga).delete()


def _merge_spec(defaults: dict, incoming: dict | None) -> dict:
    if not incoming:
        return dict(defaults)
    out = dict(defaults)
    for k, v in incoming.items():
        if v is not None:
            out[k] = v
    return out


class CargaMotorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CargaMotor
        exclude = ("carga",)
        read_only_fields = ("potencia_kw_calculada", "corrente_calculada_a")


class CargaValvulaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CargaValvula
        exclude = ("carga",)


class CargaResistenciaSerializer(serializers.ModelSerializer):
    class Meta:
        model = CargaResistencia
        exclude = ("carga",)


class CargaSensorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CargaSensor
        exclude = ("carga",)


class CargaTransdutorSerializer(serializers.ModelSerializer):
    class Meta:
        model = CargaTransdutor
        exclude = ("carga",)


class CargaListSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    projeto_codigo = serializers.CharField(source="projeto.codigo", read_only=True)
    projeto_nome = serializers.CharField(source="projeto.nome", read_only=True)
    projeto_tensao_display = serializers.CharField(
        source="projeto.get_tensao_nominal_display", read_only=True
    )
    projeto_fases_display = serializers.CharField(
        source="projeto.get_numero_fases_display", read_only=True, allow_blank=True
    )
    projeto_tipo_corrente_display = serializers.CharField(
        source="projeto.get_tipo_corrente_display", read_only=True
    )
    potencia_kw_calculada = serializers.SerializerMethodField()
    corrente_calculada_a = serializers.SerializerMethodField()
    potencia_corrente_valor = serializers.SerializerMethodField()
    potencia_corrente_unidade = serializers.SerializerMethodField()

    class Meta:
        model = Carga
        fields = (
            "id",
            "projeto",
            "projeto_codigo",
            "projeto_nome",
            "tag",
            "descricao",
            "tipo",
            "tipo_display",
            "projeto_tensao_display",
            "projeto_fases_display",
            "projeto_tipo_corrente_display",
            "potencia_kw_calculada",
            "corrente_calculada_a",
            "potencia_corrente_valor",
            "potencia_corrente_unidade",
            "quantidade",
            "ativo",
            "criado_em",
            "atualizado_em",
        )

    def _motor_ou_none(self, obj):
        if obj.tipo != TipoCargaChoices.MOTOR:
            return None
        try:
            return obj.motor
        except CargaMotor.DoesNotExist:
            return None

    def get_potencia_kw_calculada(self, obj):
        m = self._motor_ou_none(obj)
        return m.potencia_kw_calculada if m else None

    def get_corrente_calculada_a(self, obj):
        m = self._motor_ou_none(obj)
        return m.corrente_calculada_a if m else None

    def get_potencia_corrente_valor(self, obj):
        m = self._motor_ou_none(obj)
        return m.potencia_corrente_valor if m else None

    def get_potencia_corrente_unidade(self, obj):
        m = self._motor_ou_none(obj)
        return m.potencia_corrente_unidade if m else None


class CargaDetailSerializer(serializers.ModelSerializer):
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    projeto_codigo = serializers.CharField(source="projeto.codigo", read_only=True)
    projeto_nome = serializers.CharField(source="projeto.nome", read_only=True)
    motor = serializers.SerializerMethodField()
    valvula = serializers.SerializerMethodField()
    resistencia = serializers.SerializerMethodField()
    sensor = serializers.SerializerMethodField()
    transdutor = serializers.SerializerMethodField()

    class Meta:
        model = Carga
        fields = (
            "id",
            "criado_em",
            "atualizado_em",
            "ativo",
            "projeto",
            "tag",
            "descricao",
            "tipo",
            "quantidade",
            "local_instalacao",
            "observacoes",
            "exige_protecao",
            "exige_seccionamento",
            "exige_comando",
            "exige_fonte_auxiliar",
            "ocupa_entrada_digital",
            "ocupa_entrada_analogica",
            "ocupa_saida_digital",
            "ocupa_saida_analogica",
            "tipo_display",
            "projeto_codigo",
            "projeto_nome",
            "motor",
            "valvula",
            "resistencia",
            "sensor",
            "transdutor",
        )

    def get_motor(self, obj):
        if obj.tipo != TipoCargaChoices.MOTOR:
            return None
        try:
            return CargaMotorSerializer(obj.motor).data
        except CargaMotor.DoesNotExist:
            return None

    def get_valvula(self, obj):
        if obj.tipo != TipoCargaChoices.VALVULA:
            return None
        try:
            return CargaValvulaSerializer(obj.valvula).data
        except CargaValvula.DoesNotExist:
            return None

    def get_resistencia(self, obj):
        if obj.tipo != TipoCargaChoices.RESISTENCIA:
            return None
        try:
            return CargaResistenciaSerializer(obj.resistencia).data
        except CargaResistencia.DoesNotExist:
            return None

    def get_sensor(self, obj):
        if obj.tipo != TipoCargaChoices.SENSOR:
            return None
        try:
            return CargaSensorSerializer(obj.sensor).data
        except CargaSensor.DoesNotExist:
            return None

    def get_transdutor(self, obj):
        if obj.tipo != TipoCargaChoices.TRANSDUTOR:
            return None
        try:
            return CargaTransdutorSerializer(obj.transdutor).data
        except CargaTransdutor.DoesNotExist:
            return None


class CargaWriteSerializer(serializers.ModelSerializer):
    projeto_codigo = serializers.CharField(source="projeto.codigo", read_only=True)
    projeto_nome = serializers.CharField(source="projeto.nome", read_only=True)
    motor = CargaMotorSerializer(required=False, allow_null=True)
    valvula = CargaValvulaSerializer(required=False, allow_null=True)
    resistencia = CargaResistenciaSerializer(required=False, allow_null=True)
    sensor = CargaSensorSerializer(required=False, allow_null=True)
    transdutor = CargaTransdutorSerializer(required=False, allow_null=True)

    class Meta:
        model = Carga
        fields = (
            "id",
            "projeto",
            "projeto_codigo",
            "projeto_nome",
            "tag",
            "descricao",
            "tipo",
            "quantidade",
            "local_instalacao",
            "observacoes",
            "exige_protecao",
            "exige_seccionamento",
            "exige_comando",
            "exige_fonte_auxiliar",
            "ocupa_entrada_digital",
            "ocupa_entrada_analogica",
            "ocupa_saida_digital",
            "ocupa_saida_analogica",
            "ativo",
            "motor",
            "valvula",
            "resistencia",
            "sensor",
            "transdutor",
        )
        read_only_fields = ("id", "projeto_codigo", "projeto_nome")

    def validate(self, attrs):
        tipo = attrs.get("tipo", self.instance.tipo if self.instance else None)
        sensor_payload = attrs.get("sensor")
        if (
            tipo == TipoCargaChoices.SENSOR
            and isinstance(sensor_payload, dict)
            and sensor_payload.get("tipo_sinal") == TipoSinalChoices.ANALOGICO
            and not sensor_payload.get("tipo_sinal_analogico")
        ):
            raise serializers.ValidationError(
                {
                    "sensor": {
                        "tipo_sinal_analogico": (
                            "Obrigatório quando o tipo de sinal é analógico."
                        )
                    }
                }
            )
        return attrs

    def _create_spec(self, carga: Carga, tipo: str, payloads: dict) -> None:
        key = TIPO_TO_KEY.get(tipo)
        if not key:
            return
        defaults = _default_spec_payload(tipo)
        incoming = payloads.get(key)
        merged = _merge_spec(defaults, incoming)
        MODEL_BY_KEY[key].objects.create(carga=carga, **merged)

    @transaction.atomic
    def create(self, validated_data):
        payloads = {k: validated_data.pop(k, None) for k in NESTED_KEYS}
        tipo = validated_data["tipo"]
        carga = Carga.objects.create(**validated_data)
        self._create_spec(carga, tipo, payloads)
        return carga

    @transaction.atomic
    def update(self, instance, validated_data):
        payloads = {}
        for k in NESTED_KEYS:
            if k in validated_data:
                payloads[k] = validated_data.pop(k)

        tipo_anterior = instance.tipo
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        tipo_novo = instance.tipo
        key_novo = TIPO_TO_KEY.get(tipo_novo)

        if tipo_novo != tipo_anterior:
            _clear_specs(instance)
            self._create_spec(instance, tipo_novo, payloads)
        elif key_novo and key_novo in payloads and payloads[key_novo] is not None:
            Model = MODEL_BY_KEY[key_novo]
            incoming = payloads[key_novo]
            obj, created = Model.objects.get_or_create(
                carga=instance,
                defaults=_merge_spec(
                    _default_spec_payload(tipo_novo), incoming
                ),
            )
            if not created:
                for k, v in incoming.items():
                    setattr(obj, k, v)
                obj.save()
        return instance
