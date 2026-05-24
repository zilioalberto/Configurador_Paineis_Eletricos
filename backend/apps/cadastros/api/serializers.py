"""Serializers da API de cadastros comerciais."""

from rest_framework import serializers

from apps.cadastros.models import (
    CnaeParceiro,
    ContatoParceiro,
    EnderecoParceiro,
    ParceiroComercial,
    SocioParceiro,
)
from apps.cadastros.models import TipoPessoaParceiroChoices
from apps.cadastros.validation.parceiro import (
    normalizar_documento_parceiro,
    sanitizar_attrs_contato,
    sanitizar_attrs_endereco,
    sanitizar_attrs_parceiro,
)


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

    def validate(self, attrs):
        return sanitizar_attrs_endereco(attrs)


class CnaeParceiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = CnaeParceiro
        fields = (
            "id",
            "ordem",
            "codigo",
            "descricao",
            "principal",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")


class SocioParceiroSerializer(serializers.ModelSerializer):
    class Meta:
        model = SocioParceiro
        fields = (
            "id",
            "ordem",
            "nome",
            "qualificacao",
            "data_entrada",
            "faixa_etaria",
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

    def validate(self, attrs):
        return sanitizar_attrs_contato(attrs)


class ParceiroComercialSerializer(serializers.ModelSerializer):
    """Parceiro com endereços e contatos aninhados (somente leitura no detalhe)."""

    enderecos = EnderecoParceiroSerializer(many=True, read_only=True)
    contatos = ContatoParceiroSerializer(many=True, read_only=True)
    cnaes = CnaeParceiroSerializer(many=True, read_only=True)
    socios = SocioParceiroSerializer(many=True, read_only=True)
    capital_social = serializers.DecimalField(
        max_digits=18, decimal_places=2, required=False, allow_null=True
    )

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
            "situacao_cadastral",
            "situacao_cadastral_codigo",
            "data_inicio_atividade",
            "capital_social",
            "cnae_fiscal",
            "cnae_fiscal_descricao",
            "natureza_juridica",
            "consulta_receita_em",
            "enderecos",
            "contatos",
            "cnaes",
            "socios",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")

    def validate_documento(self, value):
        instance = self.instance
        tipo = self.initial_data.get("tipo_pessoa")
        if not tipo and instance is not None:
            tipo = instance.tipo_pessoa
        if not tipo:
            tipo = TipoPessoaParceiroChoices.PESSOA_JURIDICA
        return normalizar_documento_parceiro(tipo, value)

    def validate(self, attrs):
        instance = self.instance
        tipo = attrs.get("tipo_pessoa", getattr(instance, "tipo_pessoa", None))
        documento = attrs.get("documento")
        if documento is not None and tipo:
            attrs["documento"] = normalizar_documento_parceiro(tipo, documento)
        elif documento is not None and instance is not None:
            attrs["documento"] = normalizar_documento_parceiro(instance.tipo_pessoa, documento)

        attrs = sanitizar_attrs_parceiro(attrs)

        razao = attrs.get("razao_social", getattr(instance, "razao_social", ""))
        if not (razao or "").strip():
            raise serializers.ValidationError({"razao_social": "Razao social e obrigatoria."})

        eh_cliente = attrs.get("eh_cliente", getattr(instance, "eh_cliente", False))
        eh_fornecedor = attrs.get("eh_fornecedor", getattr(instance, "eh_fornecedor", False))
        eh_parceiro = attrs.get("eh_parceiro", getattr(instance, "eh_parceiro", False))
        if not any((eh_cliente, eh_fornecedor, eh_parceiro)):
            raise serializers.ValidationError(
                "Marque ao menos uma classificacao: cliente, fornecedor ou parceiro."
            )
        return attrs
