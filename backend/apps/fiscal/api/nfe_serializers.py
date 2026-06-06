"""Serializers REST de documentos fiscais recebidos e controle NSU."""
from rest_framework import serializers

from apps.fiscal.choices import (
    OrigemImportacaoFiscalChoices,
    TipoManifestacaoDestinatarioChoices,
)
from apps.fiscal.models import ControleNSU, DocumentoFiscalRecebido, ItemDocumentoFiscal
from apps.fiscal.utils import normalizar_cnpj


class ItemDocumentoFiscalSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemDocumentoFiscal
        fields = (
            "id",
            "numero_item",
            "codigo_fornecedor",
            "descricao",
            "ncm",
            "cfop",
            "unidade",
            "quantidade",
            "valor_unitario",
            "valor_total",
            "importado_para_produto",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


_MANIFESTACAO_FIELDS = (
    "manifestacao_status",
    "manifestacao_tipo",
    "manifestacao_justificativa",
    "manifestacao_protocolo",
    "manifestacao_cstat",
    "manifestacao_motivo",
    "manifestacao_solicitada_em",
    "manifestacao_registrada_em",
)


class DocumentoFiscalRecebidoSerializer(serializers.ModelSerializer):
    itens = ItemDocumentoFiscalSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentoFiscalRecebido
        fields = (
            "id",
            "chave_acesso",
            "nsu",
            "cnpj_emitente",
            "nome_emitente",
            "cnpj_destinatario",
            "nome_destinatario",
            "numero",
            "serie",
            "data_emissao",
            "valor_total",
            "natureza_operacao",
            "status_importacao",
            "origem_importacao",
            *_MANIFESTACAO_FIELDS,
            "itens",
            "criada_em",
            "atualizada_em",
        )
        read_only_fields = fields


class DocumentoFiscalRecebidoDetailSerializer(DocumentoFiscalRecebidoSerializer):
    class Meta(DocumentoFiscalRecebidoSerializer.Meta):
        fields = DocumentoFiscalRecebidoSerializer.Meta.fields + ("xml_original",)
        read_only_fields = fields


class ControleNSUSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControleNSU
        fields = (
            "id",
            "cnpj",
            "ultimo_nsu",
            "max_nsu",
            "ultimo_cstat",
            "ultimo_motivo",
            "bloqueado_ate",
            "ultima_consulta",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "cnpj", "criado_em", "atualizado_em")


class ControleNSUUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControleNSU
        fields = (
            "ultimo_nsu",
            "max_nsu",
            "ultimo_cstat",
            "ultimo_motivo",
            "bloqueado_ate",
            "ultima_consulta",
        )
        extra_kwargs = {field: {"required": False} for field in fields}


class ImportarXMLNFeSerializer(serializers.Serializer):
    cnpj_destinatario = serializers.CharField(required=False, allow_blank=True, max_length=18)
    nsu = serializers.CharField(required=False, allow_blank=True, max_length=15)
    origem_importacao = serializers.ChoiceField(
        choices=OrigemImportacaoFiscalChoices.choices,
        required=False,
        default=OrigemImportacaoFiscalChoices.MANUAL,
    )
    xml = serializers.CharField(required=True, allow_blank=False)

    def validate_xml(self, value: str) -> str:
        if not (value or "").strip():
            raise serializers.ValidationError("XML é obrigatório.")
        return value

    def validate_cnpj_destinatario(self, value: str) -> str:
        if not value:
            return ""
        cnpj = normalizar_cnpj(value)
        if len(cnpj) != 14:
            raise serializers.ValidationError(
                "CNPJ do destinatário deve conter 14 dígitos após limpeza."
            )
        return cnpj


class SolicitarManifestacaoSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=TipoManifestacaoDestinatarioChoices.choices)
    justificativa = serializers.CharField(required=False, allow_blank=True)


class ManifestacaoPendenteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoFiscalRecebido
        fields = (
            "id",
            "chave_acesso",
            "cnpj_destinatario",
            "numero",
            "serie",
            "manifestacao_tipo",
            "manifestacao_justificativa",
            "manifestacao_solicitada_em",
        )
        read_only_fields = fields


class RegistrarManifestacaoResultadoSerializer(serializers.Serializer):
    sucesso = serializers.BooleanField()
    protocolo = serializers.CharField(required=False, allow_blank=True, max_length=60)
    cstat = serializers.CharField(required=False, allow_blank=True, max_length=10)
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=255)
    mensagem_erro = serializers.CharField(required=False, allow_blank=True)
