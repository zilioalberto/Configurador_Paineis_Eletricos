"""Serializers — Simples Nacional (perfil, faturamento, projeção DAS)."""
from rest_framework import serializers

from apps.fiscal.choices import (
    AnexoSimplesNacionalChoices,
    ClassificacaoFiscalOrigemChoices,
    ObjetivoSaidaFiscalChoices,
)
from apps.fiscal.models import FaturamentoMensalAjuste, PerfilTributarioSimples
from apps.fiscal.utils import normalizar_cnpj


class PerfilTributarioSimplesSerializer(serializers.ModelSerializer):
    class Meta:
        model = PerfilTributarioSimples
        fields = (
            "id",
            "cnpj",
            "folha_salarios_12m",
            "encargos_folha_12m",
            "anexo_servicos_override",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "cnpj", "criado_em", "atualizado_em")

    def validate_anexo_servicos_override(self, value: str) -> str:
        if not value:
            return ""
        if value not in {
            AnexoSimplesNacionalChoices.III,
            AnexoSimplesNacionalChoices.V,
        }:
            raise serializers.ValidationError(
                "Use Anexo III ou V, ou deixe vazio para calcular pelo Fator R."
            )
        return value


class FaturamentoMensalAjusteSerializer(serializers.ModelSerializer):
    class Meta:
        model = FaturamentoMensalAjuste
        fields = (
            "id",
            "cnpj",
            "competencia",
            "valor_ajuste",
            "observacao",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "cnpj", "criado_em", "atualizado_em")

    def validate_competencia(self, value: str) -> str:
        raw = (value or "").strip()
        if len(raw) != 7 or raw[4] != "-":
            raise serializers.ValidationError("Use o formato AAAA-MM.")
        ano, mes = raw.split("-", 1)
        if not ano.isdigit() or not mes.isdigit():
            raise serializers.ValidationError("Competência inválida.")
        if not 1 <= int(mes) <= 12:
            raise serializers.ValidationError("Mês inválido.")
        return raw


class ClassificacaoDocumentoEmitidoSerializer(serializers.Serializer):
    objetivo_saida = serializers.ChoiceField(
        choices=ObjetivoSaidaFiscalChoices.choices,
        required=False,
    )
    anexo_simples = serializers.ChoiceField(
        choices=AnexoSimplesNacionalChoices.choices,
        required=False,
        allow_blank=True,
    )
    incluir_faturamento = serializers.BooleanField(required=False)


class ImportarLoteDocumentosEmitidosSerializer(serializers.Serializer):
    xmls = serializers.ListField(
        child=serializers.CharField(allow_blank=False),
        allow_empty=False,
        max_length=500,
    )
    classificar_automaticamente = serializers.BooleanField(required=False, default=True)


class ReclassificarDocumentosEmitidosSerializer(serializers.Serializer):
    documento_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
    )
