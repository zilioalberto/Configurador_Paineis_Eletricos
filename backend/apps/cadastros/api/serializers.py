"""Serializers da API de cadastros comerciais."""

from rest_framework import serializers

from apps.cadastros.models import ContatoParceiro, EnderecoParceiro, ParceiroComercial


class EnderecoParceiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = EnderecoParceiro
        fields = (
            "id",
            "parceiro",
            "nome",
            "logradouro",
            "numero",
            "complemento",
            "bairro",
            "municipio",
            "uf",
            "cep",
            "principal",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")


class ContatoParceiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContatoParceiro
        fields = (
            "id",
            "parceiro",
            "nome",
            "cargo",
            "email",
            "telefone",
            "principal",
            "observacoes",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")


class ParceiroComercialSerializer(serializers.ModelSerializer):
    """Parceiro com endereços e contatos aninhados (somente leitura no detalhe)."""

    enderecos = EnderecoParceiroSerializer(many=True, read_only=True)
    contatos = ContatoParceiroSerializer(many=True, read_only=True)

    class Meta:
        model = ParceiroComercial
        fields = (
            "id",
            "tipo_pessoa",
            "documento",
            "razao_social",
            "nome_fantasia",
            "inscricao_estadual",
            "email",
            "telefone",
            "eh_cliente",
            "eh_fornecedor",
            "eh_parceiro",
            "ativo",
            "origem",
            "enderecos",
            "contatos",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")

    def validate(self, attrs):
        instance = self.instance
        eh_cliente = attrs.get("eh_cliente", getattr(instance, "eh_cliente", False))
        eh_fornecedor = attrs.get("eh_fornecedor", getattr(instance, "eh_fornecedor", False))
        eh_parceiro = attrs.get("eh_parceiro", getattr(instance, "eh_parceiro", False))
        if not any((eh_cliente, eh_fornecedor, eh_parceiro)):
            raise serializers.ValidationError(
                "Marque ao menos uma classificacao: cliente, fornecedor ou parceiro."
            )
        return attrs
