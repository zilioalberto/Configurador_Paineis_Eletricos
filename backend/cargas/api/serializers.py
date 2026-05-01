from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from rest_framework import serializers

from cargas.models import (
    Carga,
    CargaModelo,
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
            "numero_fases": 3,
            "tensao_motor": 380,
            "rendimento_percentual": Decimal("85.00"),
            "fator_potencia": Decimal("0.85"),
            "tipo_partida": "DIRETA",
            "tipo_protecao": "DISJUNTOR_MOTOR",
            "reversivel": False,
            "freio_motor": False,
            "tipo_conexao_painel": "CONEXAO_BORNES_COM_PE",
        }
    if tipo == TipoCargaChoices.VALVULA:
        return {
            "tipo_valvula": "SOLENOIDE",
            "quantidade_vias": None,
            "quantidade_posicoes": None,
            "quantidade_solenoides": 1,
            "retorno_mola": False,
            "possui_feedback": False,
            "tensao_alimentacao": 24,
            "tipo_corrente": "CC",
            "corrente_consumida_ma": Decimal("200.00"),
            "tipo_protecao": "BORNE_FUSIVEL",
            "tipo_acionamento": "RELE_ESTADO_SOLIDO",
        }
    if tipo == TipoCargaChoices.RESISTENCIA:
        return {
            "numero_fases": 3,
            "tensao_resistencia": 380,
            "tipo_protecao": "FUSIVEL_ULTRARRAPIDO",
            "tipo_acionamento": "RELE_ESTADO_SOLIDO",
            "potencia_kw": Decimal("1.000"),
        }
    if tipo == TipoCargaChoices.SENSOR:
        return {
            "tipo_sensor": "INDUTIVO",
            "tipo_sinal": TipoSinalChoices.DIGITAL,
            "tipo_sinal_analogico": None,
            "tensao_alimentacao": 24,
            "tipo_corrente": "CC",
            "corrente_consumida_ma": Decimal("20.00"),
            "quantidade_fios": None,
            "pnp": False,
            "npn": False,
            "normalmente_aberto": False,
            "normalmente_fechado": False,
        }
    if tipo == TipoCargaChoices.TRANSDUTOR:
        return {
            "tipo_transdutor": "PRESSAO",
            "faixa_medicao": "",
            "tipo_sinal_analogico": "CORRENTE_4_20MA",
            "tensao_alimentacao": 24,
            "tipo_corrente": "CC",
            "corrente_consumida_ma": Decimal("20.00"),
            "quantidade_fios": None,
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
    corrente_calculada_a = serializers.SerializerMethodField()
    potencia_corrente_valor = serializers.SerializerMethodField()
    potencia_corrente_unidade = serializers.SerializerMethodField()
    tensao_carga_display = serializers.SerializerMethodField()
    tipo_corrente_carga_display = serializers.SerializerMethodField()
    fases_carga_display = serializers.SerializerMethodField()

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
            "corrente_calculada_a",
            "potencia_corrente_valor",
            "potencia_corrente_unidade",
            "tensao_carga_display",
            "tipo_corrente_carga_display",
            "fases_carga_display",
            "quantidade",
            "ativo",
            "criado_em",
            "atualizado_em",
        )

    def get_corrente_calculada_a(self, obj):
        if obj.tipo == TipoCargaChoices.MOTOR:
            try:
                return obj.motor.corrente_calculada_a
            except CargaMotor.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.RESISTENCIA:
            try:
                return obj.resistencia.corrente_calculada_a
            except CargaResistencia.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.VALVULA:
            try:
                return (
                    Decimal(obj.valvula.corrente_consumida_ma).quantize(
                        Decimal("0.001")
                    )
                    / Decimal("1000")
                )
            except CargaValvula.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.SENSOR:
            try:
                return (
                    Decimal(obj.sensor.corrente_consumida_ma).quantize(
                        Decimal("0.001")
                    )
                    / Decimal("1000")
                )
            except CargaSensor.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.TRANSDUTOR:
            try:
                return (
                    Decimal(obj.transdutor.corrente_consumida_ma).quantize(
                        Decimal("0.001")
                    )
                    / Decimal("1000")
                )
            except CargaTransdutor.DoesNotExist:
                return None
        return None

    def get_potencia_corrente_valor(self, obj):
        if obj.tipo == TipoCargaChoices.MOTOR:
            try:
                return obj.motor.potencia_corrente_valor
            except CargaMotor.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.RESISTENCIA:
            try:
                return obj.resistencia.potencia_kw
            except CargaResistencia.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.VALVULA:
            try:
                potencia_w = (
                    Decimal(obj.valvula.tensao_alimentacao)
                    * Decimal(obj.valvula.corrente_consumida_ma)
                    / Decimal("1000")
                )
                return potencia_w.quantize(Decimal("0.01"))
            except CargaValvula.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.SENSOR:
            try:
                potencia_w = (
                    Decimal(obj.sensor.tensao_alimentacao)
                    * Decimal(obj.sensor.corrente_consumida_ma)
                    / Decimal("1000")
                )
                return potencia_w.quantize(Decimal("0.01"))
            except CargaSensor.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.TRANSDUTOR:
            try:
                potencia_w = (
                    Decimal(obj.transdutor.tensao_alimentacao)
                    * Decimal(obj.transdutor.corrente_consumida_ma)
                    / Decimal("1000")
                )
                return potencia_w.quantize(Decimal("0.01"))
            except CargaTransdutor.DoesNotExist:
                return None
        return None

    def get_potencia_corrente_unidade(self, obj):
        if obj.tipo == TipoCargaChoices.MOTOR:
            try:
                return obj.motor.potencia_corrente_unidade
            except CargaMotor.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.RESISTENCIA:
            return "kW"
        if obj.tipo in (
            TipoCargaChoices.VALVULA,
            TipoCargaChoices.SENSOR,
            TipoCargaChoices.TRANSDUTOR,
        ):
            return "W"
        return None

    def get_tensao_carga_display(self, obj):
        tensao = None
        if obj.tipo == TipoCargaChoices.MOTOR:
            try:
                tensao = obj.motor.tensao_motor
            except CargaMotor.DoesNotExist:
                tensao = None
        elif obj.tipo == TipoCargaChoices.VALVULA:
            try:
                tensao = obj.valvula.tensao_alimentacao
            except CargaValvula.DoesNotExist:
                tensao = None
        elif obj.tipo == TipoCargaChoices.RESISTENCIA:
            try:
                tensao = obj.resistencia.tensao_resistencia
            except CargaResistencia.DoesNotExist:
                tensao = None
        elif obj.tipo == TipoCargaChoices.SENSOR:
            try:
                tensao = obj.sensor.tensao_alimentacao
            except CargaSensor.DoesNotExist:
                tensao = None
        elif obj.tipo == TipoCargaChoices.TRANSDUTOR:
            try:
                tensao = obj.transdutor.tensao_alimentacao
            except CargaTransdutor.DoesNotExist:
                tensao = None

        if tensao is None:
            tensao = getattr(obj.projeto, "tensao_nominal", None)
        return f"{tensao} V" if tensao else None

    def get_tipo_corrente_carga_display(self, obj):
        tipo_corrente = None
        if obj.tipo == TipoCargaChoices.VALVULA:
            try:
                tipo_corrente = obj.valvula.get_tipo_corrente_display()
            except CargaValvula.DoesNotExist:
                tipo_corrente = None
        elif obj.tipo == TipoCargaChoices.SENSOR:
            try:
                tipo_corrente = obj.sensor.get_tipo_corrente_display()
            except CargaSensor.DoesNotExist:
                tipo_corrente = None
        elif obj.tipo == TipoCargaChoices.TRANSDUTOR:
            try:
                tipo_corrente = obj.transdutor.get_tipo_corrente_display()
            except CargaTransdutor.DoesNotExist:
                tipo_corrente = None

        if tipo_corrente is None:
            tipo_corrente = getattr(obj.projeto, "get_tipo_corrente_display", lambda: None)()
        return tipo_corrente

    def get_fases_carga_display(self, obj):
        if obj.tipo == TipoCargaChoices.MOTOR:
            try:
                return obj.motor.get_numero_fases_display()
            except CargaMotor.DoesNotExist:
                return None
        if obj.tipo == TipoCargaChoices.RESISTENCIA:
            try:
                return obj.resistencia.get_numero_fases_display()
            except CargaResistencia.DoesNotExist:
                return None
        return None


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
            "quantidade_entradas_digitais",
            "quantidade_entradas_analogicas",
            "quantidade_saidas_digitais",
            "quantidade_saidas_analogicas",
            "quantidade_entradas_rapidas",
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
            "quantidade_entradas_digitais",
            "quantidade_entradas_analogicas",
            "quantidade_saidas_digitais",
            "quantidade_saidas_analogicas",
            "quantidade_entradas_rapidas",
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
        try:
            MODEL_BY_KEY[key].objects.create(carga=carga, **merged)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({key: exc.message_dict}) from exc

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
                defaults=_merge_spec(_default_spec_payload(tipo_novo), incoming),
            )
            if not created:
                for k, v in incoming.items():
                    setattr(obj, k, v)
                try:
                    obj.save()
                except DjangoValidationError as exc:
                    raise serializers.ValidationError(
                        {key_novo: exc.message_dict}
                    ) from exc
        return instance


class CargaModeloSerializer(serializers.ModelSerializer):
    def validate_payload(self, value):
        if not isinstance(value, dict):
            raise serializers.ValidationError("Payload deve ser um objeto JSON.")

        tipo = (
            self.initial_data.get("tipo")
            or getattr(self.instance, "tipo", None)
        )
        if not tipo:
            return value

        payload_limpo = {}
        if "quantidade" in value:
            payload_limpo["quantidade"] = value["quantidade"]

        chave_por_tipo = {
            TipoCargaChoices.MOTOR: "motor",
            TipoCargaChoices.VALVULA: "valvula",
            TipoCargaChoices.RESISTENCIA: "resistencia",
            TipoCargaChoices.SENSOR: "sensor",
            TipoCargaChoices.TRANSDUTOR: "transdutor",
        }
        chave_esperada = chave_por_tipo.get(tipo)
        if chave_esperada and chave_esperada in value:
            payload_limpo[chave_esperada] = value[chave_esperada]
        return payload_limpo

    class Meta:
        model = CargaModelo
        fields = (
            "id",
            "nome",
            "tipo",
            "payload",
            "ativo",
            "criado_em",
            "atualizado_em",
        )
