from rest_framework import serializers

from cargas.models import Carga
from cargas.models.motor import CargaMotor
from catalogo.models import Produto
from composicao_painel.models import ComposicaoItem, PendenciaItem, SugestaoItem
from core.choices.cargas import TipoCargaChoices
from projetos.models import Projeto


def _motor_ou_none(carga):
    if carga is None or str(carga.tipo) != TipoCargaChoices.MOTOR.value:
        return None
    try:
        return carga.motor
    except CargaMotor.DoesNotExist:
        return None


class CargaComposicaoSerializer(serializers.ModelSerializer):
    """Snapshot da carga para telas de composição (lê `descricao` e motor no ORM)."""

    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)
    potencia_corrente_valor = serializers.SerializerMethodField()
    potencia_corrente_unidade = serializers.SerializerMethodField()
    potencia_corrente_unidade_display = serializers.SerializerMethodField()
    corrente_a = serializers.SerializerMethodField()

    class Meta:
        model = Carga
        fields = (
            "id",
            "tag",
            "descricao",
            "tipo",
            "tipo_display",
            "quantidade",
            "potencia_corrente_valor",
            "potencia_corrente_unidade",
            "potencia_corrente_unidade_display",
            "corrente_a",
        )

    def get_corrente_a(self, obj):
        prio = self.context.get("corrente_prioritaria")
        corrente = prio
        if corrente is None and str(obj.tipo) == TipoCargaChoices.MOTOR.value:
            m = _motor_ou_none(obj)
            corrente = getattr(m, "corrente_calculada_a", None) if m else None
        elif corrente is None and str(obj.tipo) == TipoCargaChoices.RESISTENCIA.value:
            r = getattr(obj, "resistencia", None)
            corrente = getattr(r, "corrente_calculada_a", None) if r else None
        return str(corrente) if corrente is not None else None

    def get_potencia_corrente_valor(self, obj):
        m = _motor_ou_none(obj)
        if not m or m.potencia_corrente_valor is None:
            return None
        return str(m.potencia_corrente_valor)

    def get_potencia_corrente_unidade(self, obj):
        m = _motor_ou_none(obj)
        return m.potencia_corrente_unidade if m else None

    def get_potencia_corrente_unidade_display(self, obj):
        m = _motor_ou_none(obj)
        return m.get_potencia_corrente_unidade_display() if m else None


class ProjetoAlimentacaoSerializer(serializers.ModelSerializer):
    """Snapshot de alimentação do projeto (inclui `numero_fases`)."""

    tensao_nominal_display = serializers.CharField(
        source="get_tensao_nominal_display",
        read_only=True,
    )
    tipo_corrente_display = serializers.CharField(
        source="get_tipo_corrente_display",
        read_only=True,
    )
    numero_fases_display = serializers.SerializerMethodField()

    class Meta:
        model = Projeto
        fields = (
            "tensao_nominal",
            "tensao_nominal_display",
            "tipo_corrente",
            "tipo_corrente_display",
            "numero_fases",
            "numero_fases_display",
        )

    def get_numero_fases_display(self, obj):
        if obj.numero_fases is None:
            return ""
        return obj.get_numero_fases_display()


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
        if obj.carga_id is None:
            return None
        return CargaComposicaoSerializer(
            obj.carga,
            context={"corrente_prioritaria": obj.corrente_referencia_a},
        ).data

    def get_projeto_alimentacao(self, obj):
        return ProjetoAlimentacaoSerializer(obj.projeto).data


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
        if obj.carga_id is None:
            return None
        return CargaComposicaoSerializer(
            obj.carga,
            context={"corrente_prioritaria": obj.corrente_referencia_a},
        ).data

    def get_projeto_alimentacao(self, obj):
        return ProjetoAlimentacaoSerializer(obj.projeto).data


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
    projeto_alimentacao = serializers.SerializerMethodField()

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
            "projeto_alimentacao",
            "criado_em",
            "atualizado_em",
        )

    def get_carga(self, obj):
        if obj.carga_id is None:
            return None
        return CargaComposicaoSerializer(
            obj.carga,
            context={"corrente_prioritaria": obj.corrente_referencia_a},
        ).data

    def get_projeto_alimentacao(self, obj):
        return ProjetoAlimentacaoSerializer(obj.projeto).data
