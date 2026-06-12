"""Serializers REST de documentos fiscais recebidos e controle NSU."""
from rest_framework import serializers

from apps.fiscal.choices import (
    ObjetivoEntradaFiscalChoices,
    ObjetivoSaidaFiscalChoices,
    OrigemImportacaoFiscalChoices,
    TipoDocumentoFiscalEmitidoChoices,
    TipoManifestacaoDestinatarioChoices,
)
from apps.fiscal.models import (
    ControleNSU,
    DocumentoFiscalEmitido,
    DocumentoFiscalRecebido,
    ItemDocumentoFiscal,
    ItemDocumentoFiscalEmitido,
)
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
            "objetivo_entrada",
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


class ItemDocumentoFiscalEmitidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemDocumentoFiscalEmitido
        fields = (
            "id",
            "numero_item",
            "codigo",
            "descricao",
            "ncm",
            "cfop",
            "unidade",
            "quantidade",
            "valor_unitario",
            "valor_total",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


class DocumentoFiscalEmitidoSerializer(serializers.ModelSerializer):
    itens = ItemDocumentoFiscalEmitidoSerializer(many=True, read_only=True)

    class Meta:
        model = DocumentoFiscalEmitido
        fields = (
            "id",
            "public_id",
            "identificador",
            "tipo_documento",
            "chave_acesso",
            "cnpj_emitente",
            "nome_emitente",
            "cnpj_destinatario",
            "nome_destinatario",
            "numero",
            "serie",
            "data_emissao",
            "valor_total",
            "natureza_operacao",
            "objetivo_saida",
            "origem_importacao",
            "cfop_predominante",
            "anexo_simples",
            "incluir_faturamento",
            "classificacao_origem",
            "itens",
            "criada_em",
            "atualizada_em",
        )
        read_only_fields = fields


class DocumentoFiscalEmitidoDetailSerializer(DocumentoFiscalEmitidoSerializer):
    class Meta(DocumentoFiscalEmitidoSerializer.Meta):
        fields = DocumentoFiscalEmitidoSerializer.Meta.fields + ("xml_original",)
        read_only_fields = fields


class RelatorioNFePorObjetivoSerializer(serializers.Serializer):
    tipo_movimento = serializers.CharField()
    objetivo = serializers.CharField()
    total_documentos = serializers.IntegerField()
    valor_total = serializers.DecimalField(max_digits=18, decimal_places=2)


class RelatorioNFeResumoSerializer(serializers.Serializer):
    tipo_movimento = serializers.CharField()
    total_documentos = serializers.IntegerField()
    valor_total = serializers.DecimalField(max_digits=18, decimal_places=2)
    por_objetivo = RelatorioNFePorObjetivoSerializer(many=True)


class RelatorioNFeSerializer(serializers.Serializer):
    filtros = serializers.DictField()
    resumo = RelatorioNFeResumoSerializer()
    documentos = serializers.ListField(child=serializers.DictField())


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
    objetivo_entrada = serializers.ChoiceField(
        choices=ObjetivoEntradaFiscalChoices.choices,
        required=False,
        default=ObjetivoEntradaFiscalChoices.OUTRAS_ENTRADAS,
    )
    xml = serializers.CharField(required=True, allow_blank=False)

    def validate_xml(self, value: str) -> str:
        texto = (value or "").strip()
        if not texto:
            raise serializers.ValidationError("XML é obrigatório.")
        if not texto.startswith("<"):
            raise serializers.ValidationError("Conteúdo não parece ser um arquivo XML válido.")
        return texto

    def validate_cnpj_destinatario(self, value: str) -> str:
        if not value:
            return ""
        cnpj = normalizar_cnpj(value)
        if len(cnpj) != 14:
            raise serializers.ValidationError(
                "CNPJ do destinatário deve conter 14 dígitos após limpeza."
            )
        return cnpj


class ImportarXMLDocumentoEmitidoSerializer(serializers.Serializer):
    tipo_documento = serializers.ChoiceField(
        choices=TipoDocumentoFiscalEmitidoChoices.choices,
        required=False,
        allow_null=True,
    )
    objetivo_saida = serializers.ChoiceField(
        choices=ObjetivoSaidaFiscalChoices.choices,
        required=False,
        allow_null=True,
    )
    classificar_automaticamente = serializers.BooleanField(required=False, default=True)
    xml = serializers.CharField(required=True, allow_blank=False)

    def validate_xml(self, value: str) -> str:
        texto = (value or "").strip()
        if not texto:
            raise serializers.ValidationError("XML é obrigatório.")
        if not texto.startswith("<"):
            raise serializers.ValidationError("Conteúdo não parece ser um arquivo XML válido.")
        return texto


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
