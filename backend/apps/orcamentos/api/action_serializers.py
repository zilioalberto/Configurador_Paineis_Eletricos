from __future__ import annotations

from rest_framework import serializers

from apps.orcamentos.models import (
    PerfilOfertaChoices,
    TipoArquivoOfertaChoices,
    TipoRevisaoOrcamentoChoices,
)


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


class RevisarPrecoCatalogoItemSerializer(serializers.Serializer):
    preco_base = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=0)
    justificativa = serializers.CharField(max_length=500, trim_whitespace=True)


class GerarBlocosPadraoOfertaSerializer(serializers.Serializer):
    perfil_oferta = serializers.ChoiceField(
        choices=PerfilOfertaChoices.choices,
        required=False,
    )


class UploadArquivoOfertaSerializer(serializers.Serializer):
    tipo = serializers.ChoiceField(choices=TipoArquivoOfertaChoices.choices)
    arquivo = serializers.FileField()

    def validate(self, attrs):
        tipo = attrs["tipo"]
        arquivo = attrs["arquivo"]
        nome = (arquivo.name or "").lower()
        if tipo == TipoArquivoOfertaChoices.DOCX_REVISADO and not nome.endswith(".docx"):
            raise serializers.ValidationError({"arquivo": "Envie um arquivo .docx revisado."})
        if tipo == TipoArquivoOfertaChoices.PDF_FINAL and not nome.endswith(".pdf"):
            raise serializers.ValidationError({"arquivo": "Envie um arquivo .pdf final."})
        return attrs


class MarcarOfertaEnviadaSerializer(serializers.Serializer):
    pdf_final_id = serializers.UUIDField(required=False)
    destinatario_nome = serializers.CharField(max_length=180, required=False, allow_blank=True)
    destinatario_email = serializers.EmailField(required=False, allow_blank=True)
    assunto = serializers.CharField(max_length=255, required=False, allow_blank=True)
    mensagem = serializers.CharField(required=False, allow_blank=True)


class EnviarOfertaClienteSerializer(serializers.Serializer):
    destinatario_nome = serializers.CharField(max_length=180, required=False, allow_blank=True)
    destinatario_email = serializers.EmailField(required=False, allow_blank=True)
    destinatario_emails = serializers.ListField(
        child=serializers.EmailField(),
        required=False,
        allow_empty=True,
    )
    assunto = serializers.CharField(max_length=255, required=False, allow_blank=True)
    mensagem = serializers.CharField(required=False, allow_blank=True)
    enviar_email = serializers.BooleanField(default=False)


class ResponderOfertaPublicaSerializer(serializers.Serializer):
    decisao = serializers.ChoiceField(choices=("APROVADO", "REJEITADO"))
    nome_responsavel = serializers.CharField(max_length=180)
    cargo = serializers.CharField(max_length=120, required=False, allow_blank=True)
    email = serializers.EmailField(required=False, allow_blank=True)
    observacao = serializers.CharField(required=False, allow_blank=True)
    assinatura_data_url = serializers.CharField(required=False, allow_blank=True)
