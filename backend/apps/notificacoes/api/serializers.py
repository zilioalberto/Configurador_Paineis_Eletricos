from rest_framework import serializers

from apps.notificacoes.models import NotificacaoInterna


class NotificacaoInternaSerializer(serializers.ModelSerializer):
    class Meta:
        model = NotificacaoInterna
        fields = (
            "id",
            "tipo",
            "titulo",
            "mensagem",
            "link",
            "referencia_app",
            "referencia_id",
            "lida",
            "lida_em",
            "criado_em",
        )
        read_only_fields = fields
