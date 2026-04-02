from django.db import transaction
from rest_framework import serializers

from catalogo.models import (
    CategoriaProduto,
    EspecificacaoContatora,
    EspecificacaoDisjuntorMotor,
    EspecificacaoSeccionadora,
    Produto,
)
from core.choices.eletrica import TensaoChoices, TipoCorrenteChoices
from core.choices.produtos import CategoriaProdutoNomeChoices, ModoMontagemChoices

NESTED_KEYS = (
    "especificacao_contatora",
    "especificacao_disjuntor_motor",
    "especificacao_seccionadora",
)

CATEGORIA_PARA_CAMPO = {
    CategoriaProdutoNomeChoices.CONTATORA: "especificacao_contatora",
    CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR: "especificacao_disjuntor_motor",
    CategoriaProdutoNomeChoices.SECCIONADORA: "especificacao_seccionadora",
}

MODEL_BY_CAMPO = {
    "especificacao_contatora": EspecificacaoContatora,
    "especificacao_disjuntor_motor": EspecificacaoDisjuntorMotor,
    "especificacao_seccionadora": EspecificacaoSeccionadora,
}


def _merge_spec(defaults: dict, incoming: dict | None) -> dict:
    if not incoming:
        return dict(defaults)
    out = dict(defaults)
    for k, v in incoming.items():
        if v is not None:
            out[k] = v
    return out


def _defaults_para_categoria(nome: str) -> dict:
    if nome == CategoriaProdutoNomeChoices.CONTATORA:
        return {
            "tensao_bobina_v": TensaoChoices.V24,
            "tipo_corrente_bobina": TipoCorrenteChoices.CC,
            "contatos_aux_na": 0,
            "contatos_aux_nf": 0,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR:
        return {
            "contatos_aux_na": 0,
            "contatos_aux_nf": 0,
            "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        }
    if nome == CategoriaProdutoNomeChoices.SECCIONADORA:
        from core.choices.produtos import (
            CorManoplaChoices,
            TipoFixacaoSeccionadoraChoices,
        )

        return {
            "tipo_montagem": ModoMontagemChoices.TRILHO_DIN,
            "tipo_fixacao": TipoFixacaoSeccionadoraChoices.FURO_CENTRAL_M22_5,
            "cor_manopla": CorManoplaChoices.PUNHO_PRETO,
        }
    return {}


def _clear_specs(produto: Produto) -> None:
    EspecificacaoContatora.objects.filter(produto=produto).delete()
    EspecificacaoDisjuntorMotor.objects.filter(produto=produto).delete()
    EspecificacaoSeccionadora.objects.filter(produto=produto).delete()


def _salvar_especificacao(produto: Produto, nome_categoria: str, payload: dict | None) -> None:
    campo = CATEGORIA_PARA_CAMPO.get(nome_categoria)
    if not campo:
        return
    Model = MODEL_BY_CAMPO[campo]
    merged = _merge_spec(_defaults_para_categoria(nome_categoria), payload)
    obj = Model(produto=produto, **merged)
    obj.full_clean()
    obj.save()


class CategoriaProdutoSerializer(serializers.ModelSerializer):
    nome_display = serializers.CharField(source="get_nome_display", read_only=True)

    class Meta:
        model = CategoriaProduto
        fields = (
            "id",
            "nome",
            "nome_display",
            "descricao",
            "ativo",
            "criado_em",
            "atualizado_em",
        )


class EspecificacaoContatoraSerializer(serializers.ModelSerializer):
    tensao_bobina_display = serializers.CharField(
        source="get_tensao_bobina_v_display",
        read_only=True,
    )
    tipo_corrente_bobina_display = serializers.CharField(
        source="get_tipo_corrente_bobina_display",
        read_only=True,
    )
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoContatora
        exclude = ("produto",)


class EspecificacaoDisjuntorMotorSerializer(serializers.ModelSerializer):
    modo_montagem_display = serializers.CharField(
        source="get_modo_montagem_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoDisjuntorMotor
        exclude = ("produto",)


class EspecificacaoSeccionadoraSerializer(serializers.ModelSerializer):
    tipo_montagem_display = serializers.CharField(
        source="get_tipo_montagem_display",
        read_only=True,
    )
    tipo_fixacao_display = serializers.CharField(
        source="get_tipo_fixacao_display",
        read_only=True,
    )
    cor_manopla_display = serializers.CharField(
        source="get_cor_manopla_display",
        read_only=True,
    )

    class Meta:
        model = EspecificacaoSeccionadora
        exclude = ("produto",)


class EspecificacaoContatoraWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoContatora
        exclude = ("id", "produto", "criado_em", "atualizado_em")


class EspecificacaoDisjuntorMotorWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoDisjuntorMotor
        exclude = ("id", "produto", "criado_em", "atualizado_em")


class EspecificacaoSeccionadoraWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = EspecificacaoSeccionadora
        exclude = ("id", "produto", "criado_em", "atualizado_em")


class ProdutoListSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    categoria_display = serializers.CharField(
        source="categoria.get_nome_display",
        read_only=True,
    )
    unidade_medida_display = serializers.CharField(
        source="get_unidade_medida_display",
        read_only=True,
    )

    class Meta:
        model = Produto
        fields = (
            "id",
            "codigo",
            "descricao",
            "categoria",
            "categoria_nome",
            "categoria_display",
            "fabricante",
            "unidade_medida",
            "unidade_medida_display",
            "valor_unitario",
            "ativo",
            "criado_em",
            "atualizado_em",
        )


class ProdutoDetailSerializer(serializers.ModelSerializer):
    categoria_nome = serializers.CharField(source="categoria.nome", read_only=True)
    categoria_display = serializers.CharField(
        source="categoria.get_nome_display",
        read_only=True,
    )
    unidade_medida_display = serializers.CharField(
        source="get_unidade_medida_display",
        read_only=True,
    )
    especificacao_contatora = serializers.SerializerMethodField()
    especificacao_disjuntor_motor = serializers.SerializerMethodField()
    especificacao_seccionadora = serializers.SerializerMethodField()

    class Meta:
        model = Produto
        fields = (
            "id",
            "criado_em",
            "atualizado_em",
            "ativo",
            "codigo",
            "descricao",
            "categoria",
            "categoria_nome",
            "categoria_display",
            "unidade_medida",
            "unidade_medida_display",
            "valor_unitario",
            "fabricante",
            "referencia_fabricante",
            "largura_mm",
            "altura_mm",
            "profundidade_mm",
            "observacoes_tecnicas",
            "especificacao_contatora",
            "especificacao_disjuntor_motor",
            "especificacao_seccionadora",
        )

    def get_especificacao_contatora(self, obj):
        if obj.categoria.nome != CategoriaProdutoNomeChoices.CONTATORA:
            return None
        try:
            return EspecificacaoContatoraSerializer(obj.especificacao_contatora).data
        except EspecificacaoContatora.DoesNotExist:
            return None

    def get_especificacao_disjuntor_motor(self, obj):
        if obj.categoria.nome != CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR:
            return None
        try:
            return EspecificacaoDisjuntorMotorSerializer(
                obj.especificacao_disjuntor_motor
            ).data
        except EspecificacaoDisjuntorMotor.DoesNotExist:
            return None

    def get_especificacao_seccionadora(self, obj):
        if obj.categoria.nome != CategoriaProdutoNomeChoices.SECCIONADORA:
            return None
        try:
            return EspecificacaoSeccionadoraSerializer(obj.especificacao_seccionadora).data
        except EspecificacaoSeccionadora.DoesNotExist:
            return None


class ProdutoWriteSerializer(serializers.ModelSerializer):
    especificacao_contatora = EspecificacaoContatoraWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_disjuntor_motor = EspecificacaoDisjuntorMotorWriteSerializer(
        required=False,
        allow_null=True,
    )
    especificacao_seccionadora = EspecificacaoSeccionadoraWriteSerializer(
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Produto
        fields = (
            "id",
            "codigo",
            "descricao",
            "categoria",
            "unidade_medida",
            "valor_unitario",
            "fabricante",
            "referencia_fabricante",
            "largura_mm",
            "altura_mm",
            "profundidade_mm",
            "observacoes_tecnicas",
            "ativo",
            "especificacao_contatora",
            "especificacao_disjuntor_motor",
            "especificacao_seccionadora",
        )
        read_only_fields = ("id",)

    def validate(self, attrs):
        instance = self.instance
        categoria = attrs.get("categoria")
        if categoria is None and instance is not None:
            categoria = instance.categoria
        if categoria is None:
            return attrs
        campo = CATEGORIA_PARA_CAMPO.get(categoria.nome)
        if campo is None:
            return attrs
        if instance is None:
            if attrs.get(campo) is None:
                attrs[campo] = {}
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        payloads = {k: validated_data.pop(k, None) for k in NESTED_KEYS}
        produto = Produto.objects.create(**validated_data)
        nome = produto.categoria.nome
        if CATEGORIA_PARA_CAMPO.get(nome):
            campo = CATEGORIA_PARA_CAMPO[nome]
            _salvar_especificacao(produto, nome, payloads.get(campo))
        return produto

    @transaction.atomic
    def update(self, instance, validated_data):
        payloads = {}
        for k in NESTED_KEYS:
            if k in validated_data:
                payloads[k] = validated_data.pop(k)
        categoria_antiga_id = instance.categoria_id
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        nome_novo = instance.categoria.nome
        if instance.categoria_id != categoria_antiga_id:
            _clear_specs(instance)
            if CATEGORIA_PARA_CAMPO.get(nome_novo):
                campo = CATEGORIA_PARA_CAMPO[nome_novo]
                _salvar_especificacao(instance, nome_novo, payloads.get(campo))
            return instance
        campo = CATEGORIA_PARA_CAMPO.get(nome_novo)
        if not campo or campo not in payloads or payloads[campo] is None:
            return instance
        Model = MODEL_BY_CAMPO[campo]
        merged = _merge_spec(
            _defaults_para_categoria(nome_novo),
            payloads[campo],
        )
        try:
            spec = Model.objects.get(produto=instance)
        except Model.DoesNotExist:
            spec = Model(produto=instance, **merged)
        else:
            for k, v in merged.items():
                setattr(spec, k, v)
        spec.full_clean()
        spec.save()
        return instance
