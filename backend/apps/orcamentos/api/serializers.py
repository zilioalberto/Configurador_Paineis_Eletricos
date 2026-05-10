from __future__ import annotations

from django.db import transaction
from rest_framework import serializers
from rest_framework.serializers import empty

from apps.orcamentos.models import (
    ConfiguracaoMargemCliente,
    Orcamento,
    OrcamentoItem,
    TipoItemOrcamentoChoices,
)


class OrcamentoItemSerializer(serializers.ModelSerializer):
    """Item aninhado: `id` opcional na atualização (linhas novas sem id)."""

    id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = OrcamentoItem
        fields = (
            "id",
            "ordem",
            "tipo",
            "origem",
            "descricao",
            "quantidade",
            "custo_unitario",
            "margem_percentual",
            "preco_unitario",
        )
        read_only_fields = ()


class OrcamentoSerializer(serializers.ModelSerializer):
    itens = OrcamentoItemSerializer(many=True, required=False)
    cliente_nome = serializers.SerializerMethodField()
    contato_cliente_nome = serializers.SerializerMethodField()
    contato_cliente_email = serializers.SerializerMethodField()

    class Meta:
        model = Orcamento
        fields = (
            "id",
            "codigo",
            "titulo",
            "descricao",
            "cliente",
            "cliente_nome",
            "contato_cliente",
            "contato_cliente_nome",
            "contato_cliente_email",
            "cliente_referencia",
            "margem_produtos_percentual",
            "margem_servicos_percentual",
            "status",
            "valido_ate",
            "criado_em",
            "atualizado_em",
            "itens",
        )
        read_only_fields = (
            "id",
            "codigo",
            "cliente_nome",
            "contato_cliente_nome",
            "contato_cliente_email",
            "criado_em",
            "atualizado_em",
        )

    def get_cliente_nome(self, obj):
        return obj.cliente.razao_social if obj.cliente_id else obj.cliente_referencia

    def get_contato_cliente_nome(self, obj):
        return obj.contato_cliente.nome if obj.contato_cliente_id else ""

    def get_contato_cliente_email(self, obj):
        return obj.contato_cliente.email if obj.contato_cliente_id else ""

    def validate(self, attrs):
        instance = self.instance
        cliente = attrs.get("cliente", getattr(instance, "cliente", None))
        contato = attrs.get("contato_cliente", getattr(instance, "contato_cliente", None))
        if self.context.get("request") and self.context["request"].method == "POST" and not cliente:
            raise serializers.ValidationError({"cliente": "Selecione o cliente da proposta."})
        if cliente and not cliente.eh_cliente:
            raise serializers.ValidationError({"cliente": "O cadastro selecionado não é cliente."})
        if contato and cliente and contato.parceiro_id != cliente.id:
            raise serializers.ValidationError(
                {"contato_cliente": "O contato selecionado não pertence ao cliente."}
            )
        return attrs

    def update(self, instance, validated_data):
        itens_data = validated_data.pop("itens", empty)
        self._aplicar_margens_cliente(validated_data)
        instance = super().update(instance, validated_data)
        if itens_data is not empty:
            self._sync_itens(instance, itens_data)
        return instance

    def _aplicar_margens_cliente(self, validated_data):
        cliente = validated_data.get("cliente")
        if not cliente:
            return
        config = ConfiguracaoMargemCliente.objects.filter(cliente=cliente).first()
        if not config:
            return
        validated_data.setdefault(
            "margem_produtos_percentual",
            config.margem_produtos_percentual,
        )
        validated_data.setdefault(
            "margem_servicos_percentual",
            config.margem_servicos_percentual,
        )

    def _margem_padrao_item(self, orcamento, tipo):
        if tipo == TipoItemOrcamentoChoices.SERVICO:
            return orcamento.margem_servicos_percentual
        return orcamento.margem_produtos_percentual

    def _normalizar_item_data(self, orcamento, item_data, idx):
        data = dict(item_data)
        data["ordem"] = data.get("ordem", idx)
        data["tipo"] = data.get("tipo") or TipoItemOrcamentoChoices.PRODUTO
        data["origem"] = data.get("origem") or "MANUAL"
        data["quantidade"] = data.get("quantidade", 1)
        data["custo_unitario"] = data.get("custo_unitario", 0)
        if data.get("margem_percentual") in (None, "") or "margem_percentual" not in data:
            data["margem_percentual"] = self._margem_padrao_item(orcamento, data["tipo"])
        if "preco_unitario" not in data or data.get("preco_unitario") in (None, ""):
            custo = data.get("custo_unitario") or 0
            margem = data.get("margem_percentual") or 0
            data["preco_unitario"] = custo * (1 + margem / 100)
        return data

    def _sync_itens(self, orcamento, itens_data):
        kept_ids = []
        with transaction.atomic():
            for idx, raw in enumerate(itens_data):
                raw = self._normalizar_item_data(orcamento, raw, idx)
                item_id = raw.get("id")
                ordem = raw["ordem"]
                descricao = raw["descricao"]
                if item_id:
                    item = OrcamentoItem.objects.filter(
                        pk=item_id, orcamento=orcamento
                    ).first()
                    if item is None:
                        raise serializers.ValidationError(
                            {
                                "itens": (
                                    f"Item com id {item_id} não existe neste orçamento."
                                )
                            }
                        )
                    item.ordem = ordem
                    item.tipo = raw["tipo"]
                    item.origem = raw["origem"]
                    item.descricao = descricao
                    item.quantidade = raw["quantidade"]
                    item.custo_unitario = raw["custo_unitario"]
                    item.margem_percentual = raw["margem_percentual"]
                    item.preco_unitario = raw["preco_unitario"]
                    item.save(update_fields=(
                        "ordem",
                        "tipo",
                        "origem",
                        "descricao",
                        "quantidade",
                        "custo_unitario",
                        "margem_percentual",
                        "preco_unitario",
                    ))
                    kept_ids.append(item.pk)
                else:
                    novo = OrcamentoItem.objects.create(
                        orcamento=orcamento,
                        ordem=ordem,
                        tipo=raw["tipo"],
                        origem=raw["origem"],
                        descricao=descricao,
                        quantidade=raw["quantidade"],
                        custo_unitario=raw["custo_unitario"],
                        margem_percentual=raw["margem_percentual"],
                        preco_unitario=raw["preco_unitario"],
                    )
                    kept_ids.append(novo.pk)
            OrcamentoItem.objects.filter(orcamento=orcamento).exclude(
                pk__in=kept_ids
            ).delete()

    def create(self, validated_data):
        itens_data = validated_data.pop("itens", [])
        self._aplicar_margens_cliente(validated_data)
        with transaction.atomic():
            orcamento = Orcamento.objects.create(**validated_data)
            for idx, item_data in enumerate(itens_data):
                item_data = self._normalizar_item_data(orcamento, item_data, idx)
                OrcamentoItem.objects.create(
                    orcamento=orcamento,
                    ordem=item_data["ordem"],
                    tipo=item_data["tipo"],
                    origem=item_data["origem"],
                    descricao=item_data["descricao"],
                    quantidade=item_data["quantidade"],
                    custo_unitario=item_data["custo_unitario"],
                    margem_percentual=item_data["margem_percentual"],
                    preco_unitario=item_data["preco_unitario"],
                )
        return orcamento


class ConfiguracaoMargemClienteSerializer(serializers.ModelSerializer):
    cliente_nome = serializers.SerializerMethodField()

    class Meta:
        model = ConfiguracaoMargemCliente
        fields = (
            "id",
            "cliente",
            "cliente_nome",
            "margem_produtos_percentual",
            "margem_servicos_percentual",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = ("id", "cliente_nome", "criado_em", "atualizado_em")

    def get_cliente_nome(self, obj):
        return obj.cliente.razao_social

    def validate_cliente(self, value):
        if not value.eh_cliente:
            raise serializers.ValidationError("Selecione um cadastro marcado como cliente.")
        return value
