"""Serializers do fluxo de importação de NF-e no catálogo."""

from rest_framework import serializers

from apps.fiscal.choices import ObjetivoEntradaFiscalChoices


class NfeImportItemRequestSerializer(serializers.Serializer):
    n_item = serializers.IntegerField(min_value=1)
    importar = serializers.BooleanField()
    criar_fornecedor = serializers.BooleanField(required=False)
    fornecedor_id = serializers.UUIDField(required=False, allow_null=True)
    criar_fabricante = serializers.BooleanField(required=False)
    fabricante_id = serializers.UUIDField(required=False, allow_null=True)
    categoria_catalogo = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=50,
    )
    codigo_catalogo = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=60,
    )
    atualizar_se_existir = serializers.BooleanField(required=False, default=False)


class NfeCatalogoAplicarSerializer(serializers.Serializer):
    snapshot = serializers.JSONField()
    criar_fornecedor = serializers.BooleanField(required=False, default=False)
    fornecedor_id = serializers.UUIDField(required=False, allow_null=True)
    categoria_padrao = serializers.CharField(required=False, allow_blank=True, max_length=50)
    objetivo_entrada = serializers.ChoiceField(
        choices=ObjetivoEntradaFiscalChoices.choices,
        required=False,
        default=ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
    )
    itens = NfeImportItemRequestSerializer(many=True)
