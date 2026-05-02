from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from core.calculos.condutores import (
    listar_secoes_comerciais_mm2,
    tabela_referencia_condutores_iz,
)
from dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)


def _mm2_efetivo(escolhida, sugerida):
    if escolhida is not None:
        return escolhida
    return sugerida


def _mm2_str(v):
    if v is None:
        return None
    return str(Decimal(v))


class DimensionamentoCircuitoCargaDetalheSerializer(serializers.ModelSerializer):
    """Circuito de carga com seções sugeridas, escolhidas e efetivas (para UI/API)."""

    carga = serializers.UUIDField(source="carga_id", read_only=True)
    carga_tag = serializers.CharField(source="carga.tag", read_only=True)

    secao_condutor_fase_efetiva_mm2 = serializers.SerializerMethodField()
    secao_condutor_neutro_efetiva_mm2 = serializers.SerializerMethodField()
    secao_condutor_pe_efetiva_mm2 = serializers.SerializerMethodField()

    corrente_referencia_a = serializers.SerializerMethodField()

    class Meta:
        model = DimensionamentoCircuitoCarga
        fields = (
            "id",
            "carga",
            "carga_tag",
            "tipo_carga",
            "classificacao_circuito",
            "corrente_calculada_a",
            "corrente_projeto_a",
            "corrente_referencia_a",
            "possui_neutro",
            "possui_pe",
            "secao_condutor_fase_mm2",
            "secao_condutor_neutro_mm2",
            "secao_condutor_pe_mm2",
            "secao_condutor_fase_escolhida_mm2",
            "secao_condutor_neutro_escolhida_mm2",
            "secao_condutor_pe_escolhida_mm2",
            "secao_condutor_fase_efetiva_mm2",
            "secao_condutor_neutro_efetiva_mm2",
            "secao_condutor_pe_efetiva_mm2",
            "condutores_aprovado",
        )

    def get_corrente_referencia_a(self, obj):
        v = obj.corrente_projeto_a if obj.corrente_projeto_a is not None else obj.corrente_calculada_a
        if v is None:
            return None
        return str(Decimal(v))

    def get_secao_condutor_fase_efetiva_mm2(self, obj):
        return _mm2_str(
            _mm2_efetivo(
                obj.secao_condutor_fase_escolhida_mm2,
                obj.secao_condutor_fase_mm2,
            )
        )

    def get_secao_condutor_neutro_efetiva_mm2(self, obj):
        return _mm2_str(
            _mm2_efetivo(
                obj.secao_condutor_neutro_escolhida_mm2,
                obj.secao_condutor_neutro_mm2,
            )
        )

    def get_secao_condutor_pe_efetiva_mm2(self, obj):
        return _mm2_str(
            _mm2_efetivo(
                obj.secao_condutor_pe_escolhida_mm2,
                obj.secao_condutor_pe_mm2,
            )
        )


class DimensionamentoAlimentacaoGeralDetalheSerializer(serializers.ModelSerializer):
    secao_condutor_fase_efetiva_mm2 = serializers.SerializerMethodField()
    secao_condutor_neutro_efetiva_mm2 = serializers.SerializerMethodField()
    secao_condutor_pe_efetiva_mm2 = serializers.SerializerMethodField()

    class Meta:
        model = DimensionamentoCircuitoAlimentacaoGeral
        fields = (
            "id",
            "corrente_total_painel_a",
            "tipo_corrente",
            "numero_fases",
            "possui_neutro",
            "possui_terra",
            "secao_condutor_fase_mm2",
            "secao_condutor_neutro_mm2",
            "secao_condutor_pe_mm2",
            "secao_condutor_fase_escolhida_mm2",
            "secao_condutor_neutro_escolhida_mm2",
            "secao_condutor_pe_escolhida_mm2",
            "secao_condutor_fase_efetiva_mm2",
            "secao_condutor_neutro_efetiva_mm2",
            "secao_condutor_pe_efetiva_mm2",
            "condutores_aprovado",
        )

    def get_secao_condutor_fase_efetiva_mm2(self, obj):
        return _mm2_str(
            _mm2_efetivo(
                obj.secao_condutor_fase_escolhida_mm2,
                obj.secao_condutor_fase_mm2,
            )
        )

    def get_secao_condutor_neutro_efetiva_mm2(self, obj):
        return _mm2_str(
            _mm2_efetivo(
                obj.secao_condutor_neutro_escolhida_mm2,
                obj.secao_condutor_neutro_mm2,
            )
        )

    def get_secao_condutor_pe_efetiva_mm2(self, obj):
        return _mm2_str(
            _mm2_efetivo(
                obj.secao_condutor_pe_escolhida_mm2,
                obj.secao_condutor_pe_mm2,
            )
        )


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
            "condutores_revisao_confirmada",
        )


class DimensionamentoProjetoDetalheSerializer(ResumoDimensionamentoSerializer):
    """Resumo + circuitos, alimentação geral e tabelas para revisão de bitolas."""

    circuitos_carga = serializers.SerializerMethodField()
    alimentacao_geral = serializers.SerializerMethodField()
    secoes_comerciais_mm2 = serializers.SerializerMethodField()
    condutores_tabela_referencia = serializers.SerializerMethodField()

    class Meta(ResumoDimensionamentoSerializer.Meta):
        fields = ResumoDimensionamentoSerializer.Meta.fields + (
            "circuitos_carga",
            "alimentacao_geral",
            "secoes_comerciais_mm2",
            "condutores_tabela_referencia",
        )

    def get_circuitos_carga(self, obj):
        qs = (
            DimensionamentoCircuitoCarga.objects.filter(projeto=obj.projeto)
            .select_related("carga")
            .order_by("carga__tag")
        )
        return DimensionamentoCircuitoCargaDetalheSerializer(qs, many=True).data

    def get_alimentacao_geral(self, obj):
        ag = DimensionamentoCircuitoAlimentacaoGeral.objects.filter(
            projeto=obj.projeto
        ).first()
        if ag is None:
            return None
        return DimensionamentoAlimentacaoGeralDetalheSerializer(ag).data

    def get_secoes_comerciais_mm2(self, obj):
        return listar_secoes_comerciais_mm2()

    def get_condutores_tabela_referencia(self, obj):
        return tabela_referencia_condutores_iz()


class EscolhasCondutoresInputSerializer(serializers.Serializer):
    circuitos = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        allow_null=True,
    )
    alimentacao_geral = serializers.DictField(required=False, allow_null=True)
    confirmar_revisao = serializers.BooleanField(required=False, default=False)

    def validate(self, attrs):
        if attrs.get("circuitos") is None:
            attrs["circuitos"] = []
        if attrs.get("alimentacao_geral") is None:
            attrs["alimentacao_geral"] = {}
        attrs.setdefault("circuitos", [])
        attrs.setdefault("alimentacao_geral", {})
        return attrs
