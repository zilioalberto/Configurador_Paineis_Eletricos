import re

from rest_framework import serializers

from projetos.models import Projeto


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

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if getattr(self, "instance", None) is not None:
            self.fields["codigo"].read_only = True

    class Meta:
        model = Projeto
        fields = "__all__"

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