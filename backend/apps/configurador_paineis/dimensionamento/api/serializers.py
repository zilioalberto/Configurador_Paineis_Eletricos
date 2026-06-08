"""Serializers DRF para resumo, circuitos de condutores e PATCH de escolhas."""

from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from core.calculos.condutores import (
    listar_secoes_comerciais_mm2,
    tabela_referencia_condutores_iz,
)
from apps.configurador_paineis.dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from apps.configurador_paineis.dimensionamento.services.corrente_total import (
    calcular_correntes_por_fase_painel,
    painel_aplica_fator_demanda,
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
    """Resumo agregado do dimensionamento (sem detalhe de circuitos)."""

    correntes_por_fase_painel_a = serializers.SerializerMethodField()
    aplica_fator_demanda_seccionamento = serializers.SerializerMethodField()
    tipo_painel = serializers.CharField(source="projeto.tipo_painel", read_only=True)
    tipo_painel_display = serializers.CharField(
        source="projeto.get_tipo_painel_display",
        read_only=True,
    )
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
            "correntes_por_fase_painel_a",
            "aplica_fator_demanda_seccionamento",
            "tipo_painel",
            "tipo_painel_display",
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
            "detalhe_dimensionamento_mecanico",
            "horas_montagem",
            "observacoes",
            "possui_seccionamento",
            "tipo_seccionamento",
            "tipo_seccionamento_display",
            "condutores_revisao_confirmada",
        )

    def get_correntes_por_fase_painel_a(self, obj):
        correntes = calcular_correntes_por_fase_painel(obj.projeto)
        return [str(Decimal(c).quantize(Decimal("0.01"))) for c in correntes]

    def get_aplica_fator_demanda_seccionamento(self, obj):
        return painel_aplica_fator_demanda(obj.projeto)


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
    """Payload do PATCH `/condutores/`: bitolas escolhidas e confirmação de revisão."""

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


class DisposicaoComponenteInputSerializer(serializers.Serializer):
    instancia_id = serializers.CharField(max_length=80)
    composicao_item_id = serializers.CharField(max_length=80)
    produto_codigo = serializers.CharField(max_length=120)
    produto_descricao = serializers.CharField(max_length=255, required=False, allow_blank=True)
    modo_montagem = serializers.CharField(max_length=40, required=False, allow_blank=True)
    x_mm = serializers.IntegerField(min_value=0)
    y_mm = serializers.IntegerField(min_value=0)
    largura_mm = serializers.IntegerField(min_value=1)
    altura_mm = serializers.IntegerField(min_value=1)
    trilho_indice = serializers.IntegerField(required=False, allow_null=True, min_value=0)
    manual = serializers.BooleanField(required=False, default=False)


class EscolhasDimensionamentoMecanicoInputSerializer(serializers.Serializer):
    """Payload do PATCH `/mecanico/`: painel, canaleta e quantidades configuradas."""

    painel_produto_id = serializers.UUIDField(required=False, allow_null=True)
    canaleta_produto_id = serializers.UUIDField(required=False, allow_null=True)
    canaletas_verticais = serializers.IntegerField(required=False, min_value=0, max_value=8)
    faixas_horizontais = serializers.IntegerField(required=False, min_value=2, max_value=12)
    taxa_ocupacao_max_percentual = serializers.DecimalField(
        required=False,
        max_digits=5,
        decimal_places=2,
        min_value=Decimal("1"),
        max_value=Decimal("100"),
    )
    disposicao_componentes = DisposicaoComponenteInputSerializer(many=True, required=False)
    canaletas_horizontais_intermediarias_y_mm = serializers.ListField(
        child=serializers.IntegerField(min_value=0),
        required=False,
        allow_empty=True,
    )
