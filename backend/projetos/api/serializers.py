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

    class Meta:
        model = Projeto
        fields = "__all__"