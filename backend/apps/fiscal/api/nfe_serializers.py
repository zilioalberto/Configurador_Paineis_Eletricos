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
    ControleNsuNfseAdn,
    DocumentoFiscalEmitido,
    DocumentoFiscalRecebido,
    DocumentoSefazDistribuido,
    DocumentoNfseRecebido,
    ItemDocumentoFiscal,
    ItemDocumentoFiscalEmitido,
    ItemDocumentoNfseRecebido,
)
from apps.fiscal.utils import normalizar_cnpj


class ItemDocumentoFiscalSerializer(serializers.ModelSerializer):
    objetivo_entrada_display = serializers.CharField(
        source="get_objetivo_entrada_display", read_only=True
    )
    produto_codigo = serializers.CharField(source="produto.codigo", read_only=True, default=None)
    produto_descricao = serializers.CharField(
        source="produto.descricao", read_only=True, default=None
    )

    class Meta:
        model = ItemDocumentoFiscal
        fields = (
            "id",
            "numero_item",
            "codigo_fornecedor",
            "gtin",
            "descricao",
            "ncm",
            "cfop",
            "unidade",
            "quantidade",
            "valor_unitario",
            "valor_total",
            "objetivo_entrada",
            "objetivo_entrada_display",
            "classificacao_origem",
            "produto",
            "produto_codigo",
            "produto_descricao",
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
    objetivo_entrada_display = serializers.CharField(
        source="get_objetivo_entrada_display", read_only=True
    )
    finalidade_nfe_display = serializers.CharField(
        source="get_finalidade_nfe_display", read_only=True
    )

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
            "finalidade_nfe",
            "finalidade_nfe_display",
            "cfop_predominante",
            "status_importacao",
            "origem_importacao",
            "objetivo_entrada",
            "objetivo_entrada_display",
            "classificacao_origem",
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


class DocumentoSefazDistribuidoSerializer(serializers.ModelSerializer):
    documento_recebido_id = serializers.IntegerField(read_only=True)

    class Meta:
        model = DocumentoSefazDistribuido
        fields = (
            "id",
            "chave_acesso",
            "nsu",
            "schema",
            "tipo_documento",
            "status",
            "cnpj_emitente",
            "nome_emitente",
            "cnpj_destinatario",
            "nome_destinatario",
            "data_emissao",
            "valor_total",
            "situacao_nfe",
            "protocolo",
            "recebido_em_sefaz",
            *_MANIFESTACAO_FIELDS,
            "documento_recebido_id",
            "ultimo_erro",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


class DocumentoSefazDistribuidoDetailSerializer(DocumentoSefazDistribuidoSerializer):
    class Meta(DocumentoSefazDistribuidoSerializer.Meta):
        fields = DocumentoSefazDistribuidoSerializer.Meta.fields + ("xml_resumo", "xml_completo")
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
        allow_null=True,
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


class ControleNsuNfseAdnSerializer(serializers.ModelSerializer):
    class Meta:
        model = ControleNsuNfseAdn
        fields = (
            "id",
            "cnpj",
            "ultimo_nsu",
            "max_nsu",
            "ultimo_status",
            "ultimo_motivo",
            "bloqueado_ate",
            "ultima_consulta",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


class ItemDocumentoNfseRecebidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = ItemDocumentoNfseRecebido
        fields = ("id", "numero_item", "descricao", "valor_total")


class DocumentoNfseRecebidoSerializer(serializers.ModelSerializer):
    class Meta:
        model = DocumentoNfseRecebido
        fields = (
            "id",
            "public_id",
            "identificador",
            "chave_acesso",
            "nsu_adn",
            "cnpj_prestador",
            "nome_prestador",
            "cnpj_tomador",
            "nome_tomador",
            "numero",
            "codigo_verificacao",
            "valor_total",
            "data_emissao",
            "descricao_servico",
            "status_importacao",
            "origem_importacao",
            "objetivo_entrada",
            "criada_em",
            "atualizada_em",
        )
        read_only_fields = fields


class DocumentoNfseRecebidoDetailSerializer(DocumentoNfseRecebidoSerializer):
    itens = ItemDocumentoNfseRecebidoSerializer(many=True, read_only=True)
    xml_original = serializers.CharField(read_only=True)

    class Meta(DocumentoNfseRecebidoSerializer.Meta):
        fields = DocumentoNfseRecebidoSerializer.Meta.fields + ("itens", "xml_original")


class ImportarCatalogoItemSerializer(serializers.Serializer):
    n_item = serializers.IntegerField(min_value=1)
    importar = serializers.BooleanField()
    criar_fornecedor = serializers.BooleanField(required=False)
    fornecedor_id = serializers.UUIDField(required=False, allow_null=True)
    criar_fabricante = serializers.BooleanField(required=False)
    fabricante_id = serializers.UUIDField(required=False, allow_null=True)
    categoria_catalogo = serializers.CharField(required=False, allow_blank=True, max_length=50)
    codigo_catalogo = serializers.CharField(required=False, allow_blank=True, max_length=60)
    atualizar_se_existir = serializers.BooleanField(required=False, default=False)


class ImportarCatalogoNFeSerializer(serializers.Serializer):
    """Importa os produtos de uma NF-e recebida para o catálogo."""

    criar_fornecedor = serializers.BooleanField(required=False, default=False)
    fornecedor_id = serializers.UUIDField(required=False, allow_null=True)
    categoria_padrao = serializers.CharField(required=False, allow_blank=True, max_length=50)
    itens = ImportarCatalogoItemSerializer(many=True)


class VincularProdutoItemSerializer(serializers.Serializer):
    produto_id = serializers.UUIDField()
    registrar_depara = serializers.BooleanField(required=False, default=True)


class ItemReclassificacaoSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    objetivo_entrada = serializers.ChoiceField(choices=ObjetivoEntradaFiscalChoices.choices)


class ReclassificarEntradaSerializer(serializers.Serializer):
    """Reclassificação manual da destinação de uma NF-e recebida."""

    objetivo_entrada = serializers.ChoiceField(
        choices=ObjetivoEntradaFiscalChoices.choices,
        required=False,
        allow_null=True,
    )
    itens = ItemReclassificacaoSerializer(many=True, required=False)

    def validate(self, attrs):
        if not attrs.get("objetivo_entrada") and not attrs.get("itens"):
            raise serializers.ValidationError(
                "Informe o objetivo da nota e/ou a reclassificação de itens."
            )
        return attrs
