from rest_framework import serializers

from catalogo.models import Produto
from composicao_painel.models import ComposicaoItem, PendenciaItem, SugestaoItem
from core.choices.cargas import TipoCargaChoices


def _carga_detalhe(carga, corrente_prioritaria=None):
    if carga is None:
        return None
    corrente = corrente_prioritaria
    if corrente is None and carga.tipo == TipoCargaChoices.MOTOR:
        m = getattr(carga, "motor", None)
        corrente = getattr(m, "corrente_calculada_a", None) if m else None
    elif corrente is None and carga.tipo == TipoCargaChoices.RESISTENCIA:
        r = getattr(carga, "resistencia", None)
        corrente = getattr(r, "corrente_calculada_a", None) if r else None
    return {
        "id": str(carga.id),
        "tag": carga.tag,
        "tipo": carga.tipo,
        "tipo_display": carga.get_tipo_display(),
        "corrente_a": str(corrente) if corrente is not None else None,
    }


def _projeto_alimentacao(projeto):
    return {
        "tensao_nominal": projeto.tensao_nominal,
        "tensao_nominal_display": projeto.get_tensao_nominal_display(),
        "tipo_corrente": projeto.tipo_corrente,
        "tipo_corrente_display": projeto.get_tipo_corrente_display(),
    }


class ProdutoMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = ("id", "codigo", "descricao", "fabricante")


class ProdutoAlternativaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Produto
        fields = ("id", "codigo", "descricao", "fabricante", "valor_unitario")


class AprovarSugestaoInputSerializer(serializers.Serializer):
    produto_id = serializers.UUIDField(required=False, allow_null=True)


class SugestaoItemSerializer(serializers.ModelSerializer):
    parte_painel_display = serializers.CharField(
        source="get_parte_painel_display",
        read_only=True,
    )
    categoria_produto_display = serializers.CharField(
        source="get_categoria_produto_display",
        read_only=True,
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    produto = ProdutoMiniSerializer(read_only=True)
    produto_codigo = serializers.SerializerMethodField()
    carga = serializers.SerializerMethodField()
    projeto_alimentacao = serializers.SerializerMethodField()

    class Meta:
        model = SugestaoItem
        fields = (
            "id",
            "parte_painel",
            "parte_painel_display",
            "categoria_produto",
            "categoria_produto_display",
            "quantidade",
            "corrente_referencia_a",
            "status",
            "status_display",
            "memoria_calculo",
            "observacoes",
            "ordem",
            "produto",
            "produto_codigo",
            "carga",
            "projeto_alimentacao",
            "criado_em",
            "atualizado_em",
        )

    def get_produto_codigo(self, obj):
        return obj.produto.codigo if obj.produto_id else None

    def get_carga(self, obj):
        return _carga_detalhe(obj.carga, obj.corrente_referencia_a)

    def get_projeto_alimentacao(self, obj):
        return _projeto_alimentacao(obj.projeto)


class ComposicaoItemSerializer(serializers.ModelSerializer):
    parte_painel_display = serializers.CharField(
        source="get_parte_painel_display",
        read_only=True,
    )
    categoria_produto_display = serializers.CharField(
        source="get_categoria_produto_display",
        read_only=True,
    )
    produto = ProdutoMiniSerializer(read_only=True)
    produto_codigo = serializers.SerializerMethodField()
    carga = serializers.SerializerMethodField()
    projeto_alimentacao = serializers.SerializerMethodField()

    class Meta:
        model = ComposicaoItem
        fields = (
            "id",
            "parte_painel",
            "parte_painel_display",
            "categoria_produto",
            "categoria_produto_display",
            "quantidade",
            "corrente_referencia_a",
            "memoria_calculo",
            "observacoes",
            "ordem",
            "produto",
            "produto_codigo",
            "carga",
            "projeto_alimentacao",
            "criado_em",
            "atualizado_em",
        )

    def get_produto_codigo(self, obj):
        return obj.produto.codigo if obj.produto_id else None

    def get_carga(self, obj):
        return _carga_detalhe(obj.carga, obj.corrente_referencia_a)

    def get_projeto_alimentacao(self, obj):
        return _projeto_alimentacao(obj.projeto)


class PendenciaItemSerializer(serializers.ModelSerializer):
    parte_painel_display = serializers.CharField(
        source="get_parte_painel_display",
        read_only=True,
    )
    categoria_produto_display = serializers.CharField(
        source="get_categoria_produto_display",
        read_only=True,
    )
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    carga = serializers.SerializerMethodField()

    class Meta:
        model = PendenciaItem
        fields = (
            "id",
            "parte_painel",
            "parte_painel_display",
            "categoria_produto",
            "categoria_produto_display",
            "corrente_referencia_a",
            "descricao",
            "memoria_calculo",
            "observacoes",
            "status",
            "status_display",
            "ordem",
            "carga",
            "criado_em",
            "atualizado_em",
        )

    def get_carga(self, obj):
        if obj.carga_id is None:
            return None
        return {"id": str(obj.carga_id), "tag": obj.carga.tag}
