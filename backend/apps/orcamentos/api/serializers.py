from __future__ import annotations

from django.db import transaction
from rest_framework import serializers
from rest_framework.serializers import empty

from apps.orcamentos.models import Orcamento, OrcamentoItem


class OrcamentoItemSerializer(serializers.ModelSerializer):
    """Item aninhado: `id` opcional na atualização (linhas novas sem id)."""

    id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = OrcamentoItem
        fields = ("id", "ordem", "descricao", "quantidade", "preco_unitario")
        read_only_fields = ()


class OrcamentoSerializer(serializers.ModelSerializer):
    itens = OrcamentoItemSerializer(many=True, required=False)

    class Meta:
        model = Orcamento
        fields = (
            "id",
            "codigo",
            "titulo",
            "descricao",
            "cliente_referencia",
            "status",
            "valido_ate",
            "criado_em",
            "atualizado_em",
            "itens",
        )
        read_only_fields = ("id", "criado_em", "atualizado_em")

    def update(self, instance, validated_data):
        itens_data = validated_data.pop("itens", empty)
        instance = super().update(instance, validated_data)
        if itens_data is not empty:
            self._sync_itens(instance, itens_data)
        return instance

    def _sync_itens(self, orcamento, itens_data):
        kept_ids = []
        with transaction.atomic():
            for idx, raw in enumerate(itens_data):
                item_id = raw.get("id")
                ordem = raw.get("ordem", idx)
                descricao = raw["descricao"]
                quantidade = raw.get("quantidade", 1)
                preco_unitario = raw.get("preco_unitario", 0)
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
                    item.descricao = descricao
                    item.quantidade = quantidade
                    item.preco_unitario = preco_unitario
                    item.save(update_fields=(
                        "ordem",
                        "descricao",
                        "quantidade",
                        "preco_unitario",
                    ))
                    kept_ids.append(item.pk)
                else:
                    novo = OrcamentoItem.objects.create(
                        orcamento=orcamento,
                        ordem=ordem,
                        descricao=descricao,
                        quantidade=quantidade,
                        preco_unitario=preco_unitario,
                    )
                    kept_ids.append(novo.pk)
            OrcamentoItem.objects.filter(orcamento=orcamento).exclude(
                pk__in=kept_ids
            ).delete()

    def create(self, validated_data):
        itens_data = validated_data.pop("itens", [])
        with transaction.atomic():
            orcamento = Orcamento.objects.create(**validated_data)
            for idx, item_data in enumerate(itens_data):
                ordem = item_data.get("ordem", idx)
                OrcamentoItem.objects.create(
                    orcamento=orcamento,
                    ordem=ordem,
                    descricao=item_data["descricao"],
                    quantidade=item_data.get("quantidade", 1),
                    preco_unitario=item_data.get("preco_unitario", 0),
                )
        return orcamento
