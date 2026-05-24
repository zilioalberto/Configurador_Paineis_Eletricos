from __future__ import annotations

from rest_framework import serializers

from apps.orcamentos.models import TipoRevisaoOrcamentoChoices


class NovaRevisaoOrcamentoSerializer(serializers.Serializer):
    tipo_revisao = serializers.ChoiceField(
        choices=(
            TipoRevisaoOrcamentoChoices.COMERCIAL,
            TipoRevisaoOrcamentoChoices.TECNICA,
        ),
    )
    paineis_reconfigurar = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        allow_empty=True,
    )
    titulo = serializers.CharField(max_length=200, required=False, allow_blank=True)
    descricao = serializers.CharField(required=False, allow_blank=True)


class AdicionarPainelConfiguradorSerializer(serializers.Serializer):
    descricao_painel = serializers.CharField(max_length=200)


class VincularProjetoConfiguradorSerializer(serializers.Serializer):
    projeto_configurador_id = serializers.UUIDField()
