from django.contrib.auth import get_user_model
from rest_framework import serializers

from apps.rh.models import Cargo, Colaborador, Departamento, Equipe, JornadaTrabalho

User = get_user_model()


class DepartamentoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Departamento
        fields = (
            "id",
            "nome",
            "codigo",
            "descricao",
            "ativo",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")


class CargoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Cargo
        fields = (
            "id",
            "nome",
            "descricao",
            "ativo",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")


class JornadaTrabalhoSerializer(serializers.ModelSerializer):
    class Meta:
        model = JornadaTrabalho
        fields = (
            "id",
            "nome",
            "carga_horaria_semanal",
            "hora_inicio",
            "hora_fim",
            "intervalo_inicio",
            "intervalo_fim",
            "dias_semana",
            "ativo",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")

    def validate_dias_semana(self, value):
        if value in (None, ""):
            return []
        if not isinstance(value, list):
            raise serializers.ValidationError("Informe uma lista de dias da semana.")
        dias = []
        for item in value:
            try:
                dia = int(item)
            except (TypeError, ValueError) as exc:
                raise serializers.ValidationError("Dias da semana devem ser números de 0 a 6.") from exc
            if dia < 0 or dia > 6:
                raise serializers.ValidationError("Dias da semana devem estar entre 0 e 6.")
            if dia not in dias:
                dias.append(dia)
        return dias

    def validate(self, attrs):
        hora_inicio = attrs.get("hora_inicio", getattr(self.instance, "hora_inicio", None))
        hora_fim = attrs.get("hora_fim", getattr(self.instance, "hora_fim", None))
        intervalo_inicio = attrs.get(
            "intervalo_inicio",
            getattr(self.instance, "intervalo_inicio", None),
        )
        intervalo_fim = attrs.get("intervalo_fim", getattr(self.instance, "intervalo_fim", None))
        if hora_inicio and hora_fim and hora_inicio >= hora_fim:
            raise serializers.ValidationError({"hora_fim": "Deve ser maior que a hora inicial."})
        if intervalo_inicio and intervalo_fim and intervalo_inicio >= intervalo_fim:
            raise serializers.ValidationError(
                {"intervalo_fim": "Deve ser maior que o início do intervalo."}
            )
        return attrs


class EquipeSerializer(serializers.ModelSerializer):
    departamento_nome = serializers.SerializerMethodField()
    lider_nome = serializers.SerializerMethodField()

    class Meta:
        model = Equipe
        fields = (
            "id",
            "nome",
            "departamento",
            "departamento_nome",
            "lider",
            "lider_nome",
            "descricao",
            "ativo",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "departamento_nome", "lider_nome", "criado_em", "atualizado_em")

    def get_departamento_nome(self, obj):
        return obj.departamento.nome if obj.departamento_id else ""

    def get_lider_nome(self, obj):
        return obj.lider.nome if obj.lider_id else ""


class ColaboradorSerializer(serializers.ModelSerializer):
    usuario_email = serializers.SerializerMethodField()
    cargo_nome = serializers.SerializerMethodField()
    departamento_nome = serializers.SerializerMethodField()
    equipe_nome = serializers.SerializerMethodField()
    jornada_nome = serializers.SerializerMethodField()

    class Meta:
        model = Colaborador
        fields = (
            "id",
            "usuario",
            "usuario_email",
            "matricula",
            "nome",
            "email",
            "telefone",
            "documento",
            "cargo",
            "cargo_nome",
            "departamento",
            "departamento_nome",
            "equipe",
            "equipe_nome",
            "jornada",
            "jornada_nome",
            "data_admissao",
            "data_demissao",
            "ativo",
            "observacoes",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = (
            "id",
            "usuario_email",
            "cargo_nome",
            "departamento_nome",
            "equipe_nome",
            "jornada_nome",
            "criado_em",
            "atualizado_em",
        )

    def get_usuario_email(self, obj):
        return obj.usuario.email if obj.usuario_id else ""

    def get_cargo_nome(self, obj):
        return obj.cargo.nome if obj.cargo_id else ""

    def get_departamento_nome(self, obj):
        return obj.departamento.nome if obj.departamento_id else ""

    def get_equipe_nome(self, obj):
        return obj.equipe.nome if obj.equipe_id else ""

    def get_jornada_nome(self, obj):
        return obj.jornada.nome if obj.jornada_id else ""

    def validate(self, attrs):
        data_admissao = attrs.get("data_admissao", getattr(self.instance, "data_admissao", None))
        data_demissao = attrs.get("data_demissao", getattr(self.instance, "data_demissao", None))
        departamento = attrs.get("departamento", getattr(self.instance, "departamento", None))
        equipe = attrs.get("equipe", getattr(self.instance, "equipe", None))

        if data_admissao and data_demissao and data_demissao < data_admissao:
            raise serializers.ValidationError(
                {"data_demissao": "A demissão não pode ser anterior à admissão."}
            )
        if equipe and departamento and equipe.departamento_id and equipe.departamento_id != departamento.id:
            raise serializers.ValidationError(
                {"equipe": "A equipe pertence a outro departamento."}
            )
        return attrs
