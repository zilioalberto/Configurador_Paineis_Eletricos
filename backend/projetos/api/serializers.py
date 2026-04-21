import re

from rest_framework import serializers

from projetos.models import Projeto, ProjetoEvento


class ProjetoSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )
    tipo_painel_display = serializers.CharField(
        source="get_tipo_painel_display",
        read_only=True,
    )
    tipo_seccionamento_display = serializers.CharField(
        source="get_tipo_seccionamento_display",
        read_only=True,
    )
    tipo_conexao_alimentacao_potencia_display = serializers.CharField(
        source="get_tipo_conexao_alimentacao_potencia_display",
        read_only=True,
    )
    tipo_conexao_alimentacao_neutro_display = serializers.CharField(
        source="get_tipo_conexao_alimentacao_neutro_display",
        read_only=True,
    )
    tipo_conexao_alimentacao_terra_display = serializers.CharField(
        source="get_tipo_conexao_alimentacao_terra_display",
        read_only=True,
    )
    tipo_climatizacao_display = serializers.CharField(
        source="get_tipo_climatizacao_display",
        read_only=True,
    )
    criado_por_nome = serializers.SerializerMethodField()
    atualizado_por_nome = serializers.SerializerMethodField()
    responsavel_nome = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if getattr(self, "instance", None) is not None:
            self.fields["codigo"].read_only = True

    class Meta:
        model = Projeto
        fields = "__all__"
        read_only_fields = (
            "criado_por",
            "atualizado_por",
        )

    def validate_codigo(self, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return value
        v = value.strip().upper()
        if not re.fullmatch(r"\d{2}\d{3}-\d{2}", v):
            raise serializers.ValidationError(
                "Código deve estar no formato MMnnn-AA (ex.: 04001-26)."
            )
        # Em criação, não checamos unicidade aqui: duas requisições podem receber a mesma
        # sugestão; o `Projeto.save()` trata colisão com retry e novo código. Na edição,
        # o código é read-only; esta checagem cobre alterações futuras via admin/API.
        if self.instance is not None:
            qs = Projeto.objects.filter(codigo=v).exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Este código já está em uso.")
        return v

    def get_criado_por_nome(self, obj):
        user = obj.criado_por
        if not user:
            return None
        nome = (f"{user.first_name} {user.last_name}").strip()
        return nome or user.email

    def get_atualizado_por_nome(self, obj):
        user = obj.atualizado_por
        if not user:
            return None
        nome = (f"{user.first_name} {user.last_name}").strip()
        return nome or user.email

    def get_responsavel_nome(self, obj):
        user = obj.responsavel
        if not user:
            return None
        nome = (f"{user.first_name} {user.last_name}").strip()
        return nome or user.email


class ProjetoDashboardMiniSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = Projeto
        fields = (
            "id",
            "codigo",
            "nome",
            "status",
            "status_display",
            "criado_em",
            "atualizado_em",
        )


class ProjetoEventoSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = ProjetoEvento
        fields = (
            "id",
            "projeto",
            "usuario",
            "usuario_nome",
            "modulo",
            "acao",
            "descricao",
            "detalhes",
            "criado_em",
        )

    def get_usuario_nome(self, obj):
        user = obj.usuario
        if not user:
            return None
        nome = (f"{user.first_name} {user.last_name}").strip()
        return nome or user.email