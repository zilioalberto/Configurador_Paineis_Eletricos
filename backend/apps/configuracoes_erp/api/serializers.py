"""Serializer de parâmetro de configuração ERP."""
from rest_framework import serializers

from apps.configuracoes_erp.models import ParametroConfiguracao


class ParametroConfiguracaoSerializer(serializers.ModelSerializer):
    """Chave única, valor texto e descrição amigável."""

    class Meta:
        model = ParametroConfiguracao
        fields = ("id", "chave", "valor", "descricao", "atualizado_em")
        read_only_fields = ("id", "atualizado_em")
