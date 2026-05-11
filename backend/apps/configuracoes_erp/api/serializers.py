from rest_framework import serializers

from apps.configuracoes_erp.models import ParametroConfiguracao


class ParametroConfiguracaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ParametroConfiguracao
        fields = ("id", "chave", "valor", "descricao", "atualizado_em")
        read_only_fields = ("id", "atualizado_em")
