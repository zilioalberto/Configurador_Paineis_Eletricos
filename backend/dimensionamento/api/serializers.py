from rest_framework import serializers

from dimensionamento.models import ResumoDimensionamento


class ResumoDimensionamentoSerializer(serializers.ModelSerializer):
    projeto = serializers.UUIDField(source="projeto_id", read_only=True)
    projeto_codigo = serializers.CharField(source="projeto.codigo", read_only=True)
    projeto_nome = serializers.CharField(source="projeto.nome", read_only=True)
    possui_seccionamento = serializers.BooleanField(
        source="projeto.possui_seccionamento",
        read_only=True,
    )
    tipo_seccionamento = serializers.CharField(
        source="projeto.tipo_seccionamento",
        read_only=True,
        allow_null=True,
    )
    tipo_seccionamento_display = serializers.CharField(
        source="projeto.get_tipo_seccionamento_display",
        read_only=True,
        allow_blank=True,
    )

    class Meta:
        model = ResumoDimensionamento
        fields = (
            "id",
            "projeto",
            "projeto_codigo",
            "projeto_nome",
            "criado_em",
            "atualizado_em",
            "corrente_total_painel_a",
            "corrente_estimada_fonte_24vcc_a",
            "necessita_fonte_24vcc",
            "necessita_plc",
            "necessita_expansao_plc",
            "total_entradas_digitais",
            "total_saidas_digitais",
            "total_entradas_analogicas",
            "total_saidas_analogicas",
            "largura_painel_mm",
            "altura_painel_mm",
            "profundidade_painel_mm",
            "taxa_ocupacao_percentual",
            "horas_montagem",
            "observacoes",
            "possui_seccionamento",
            "tipo_seccionamento",
            "tipo_seccionamento_display",
        )
