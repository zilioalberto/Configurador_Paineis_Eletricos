"""Serializers REST do catálogo de serviços."""

from rest_framework import serializers

from apps.catalogo.models import Servico


class ServicoListSerializer(serializers.ModelSerializer):
    unidade_medida_display = serializers.CharField(
        source="get_unidade_medida_display",
        read_only=True,
    )

    class Meta:
        model = Servico
        fields = (
            "id",
            "codigo",
            "descricao",
            "categoria",
            "unidade_medida",
            "unidade_medida_display",
            "custo_referencia",
            "custo_atualizado_em",
            "ativo",
            "observacoes",
            "criado_em",
            "atualizado_em",
        )


class ServicoWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = Servico
        fields = (
            "codigo",
            "descricao",
            "categoria",
            "unidade_medida",
            "custo_referencia",
            "custo_atualizado_em",
            "ativo",
            "observacoes",
        )
