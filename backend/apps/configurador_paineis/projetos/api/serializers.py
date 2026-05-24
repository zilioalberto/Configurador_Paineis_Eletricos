"""Serializers DRF para leitura/escrita de projetos e eventos."""

import re

from rest_framework import serializers

from apps.configurador_paineis.projetos.models import ProjetoConfigurador, ProjetoConfiguradorEvento


class ProjetoSerializer(serializers.ModelSerializer):
    """Serializer completo do projeto; código read-only após criação."""

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
        model = ProjetoConfigurador
        fields = "__all__"
        read_only_fields = (
            "criado_por",
            "atualizado_por",
        )
        extra_kwargs = {
            "familia_plc": {"allow_null": True, "required": False},
            "tipo_climatizacao": {"allow_null": True, "required": False},
            "tipo_seccionamento": {"allow_null": True, "required": False},
        }

    def validate_codigo(self, value):
        if value is None or (isinstance(value, str) and not value.strip()):
            return value
        v = value.strip().upper()
        formato_conf = bool(re.fullmatch(r"CONF-\d{5}-\d{2}(-P\d{2})?", v))
        formato_auto = bool(re.fullmatch(r"\d{2}\d{3}-\d{2}", v))
        if not formato_conf and not formato_auto:
            raise serializers.ValidationError(
                "Código deve estar no formato MMnnn-AA, CONF-MMnnn-AA "
                "(ex.: CONF-05008-26) ou CONF-MMnnn-AA-P02 para painéis adicionais."
            )
        # Em criação, não checamos unicidade aqui: duas requisições podem receber a mesma
        # sugestão; o `Projeto.save()` trata colisão com retry e novo código. Na edição,
        # o código é read-only; esta checagem cobre alterações futuras via admin/API.
        if self.instance is not None:
            qs = ProjetoConfigurador.objects.filter(codigo=v).exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError("Este código já está em uso.")
        return v

    def validate(self, attrs):
        """Normaliza campos dependentes quando checkboxes vêm como False sem valor explícito."""
        attrs = super().validate(attrs)

        if attrs.get("possui_plc") is False and attrs.get("familia_plc") is None:
            attrs["familia_plc"] = ""

        if (
            attrs.get("possui_climatizacao") is False
            and attrs.get("tipo_climatizacao") is None
        ):
            attrs["tipo_climatizacao"] = ""

        if (
            attrs.get("possui_seccionamento") is False
            and attrs.get("tipo_seccionamento") is None
        ):
            attrs["tipo_seccionamento"] = ""

        return attrs

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
    """Resumo enxuto para cards do dashboard (KPIs e lista recente)."""

    status_display = serializers.CharField(
        source="get_status_display",
        read_only=True,
    )

    class Meta:
        model = ProjetoConfigurador
        fields = (
            "id",
            "codigo",
            "nome",
            "status",
            "status_display",
            "criado_em",
            "atualizado_em",
        )


class ProjetoConfiguradorEventoSerializer(serializers.ModelSerializer):
    """Evento de rastreabilidade com nome legível do usuário."""

    usuario_nome = serializers.SerializerMethodField()

    class Meta:
        model = ProjetoConfiguradorEvento
        fields = (
            "id",
            "projeto_configurador",
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
