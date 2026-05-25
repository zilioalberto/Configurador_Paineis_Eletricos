"""
Serializers de orçamento: itens aninhados, sync por lista e integração catálogo/fiscal.
"""
from __future__ import annotations

from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.serializers import empty

from apps.catalogo.models import Produto
from apps.fiscal.services import p_ipi_referencia_produto
from apps.orcamentos.models import (
    ConfiguracaoMargemCliente,
    Orcamento,
    OrcamentoItem,
    OrigemItemOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from apps.orcamentos.services.preco_linha import calcular_preco_unitario_linha

_ORCAMENTO_ITEM_MERGE_FIELDS = (
    "tipo",
    "origem",
    "descricao",
    "quantidade",
    "custo_unitario",
    "margem_percentual",
    "preco_unitario",
    "produto",
)


class OrcamentoConfiguradorPainelSerializer(serializers.ModelSerializer):
    projeto_configurador_codigo = serializers.SerializerMethodField()
    pendencias_abertas = serializers.SerializerMethodField()

    class Meta:
        from apps.orcamentos.models import OrcamentoConfiguradorPainel

        model = OrcamentoConfiguradorPainel
        fields = (
            "id",
            "ordem",
            "descricao_painel",
            "modo",
            "projeto_configurador_id",
            "projeto_configurador_codigo",
            "projeto_configurador_origem_id",
            "configurador_painel_origem_id",
            "pendencias_abertas",
            "sincronizado_em",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields

    def get_projeto_configurador_codigo(self, obj):
        if obj.projeto_configurador_id:
            return obj.projeto_configurador.codigo
        return ""

    def get_pendencias_abertas(self, obj):
        if not obj.projeto_configurador_id:
            return 0
        from apps.orcamentos.services.configurador_painel import (
            contar_pendencias_abertas_projeto,
        )

        return contar_pendencias_abertas_projeto(obj.projeto_configurador)


class OrcamentoItemSerializer(serializers.ModelSerializer):
    """Item aninhado: `id` opcional na atualização (linhas novas sem id)."""

    id = serializers.UUIDField(required=False, allow_null=True)
    descricao = serializers.CharField(max_length=500, required=False, allow_blank=True)
    produto_codigo = serializers.SerializerMethodField()
    produto_ncm = serializers.SerializerMethodField()
    produto = serializers.PrimaryKeyRelatedField(
        queryset=Produto.objects.all(),
        required=False,
        allow_null=True,
    )

    def get_produto_codigo(self, obj):
        return obj.produto.codigo if obj.produto_id else ""

    def get_produto_ncm(self, obj):
        if obj.tipo == TipoItemOrcamentoChoices.SERVICO:
            return ""
        if obj.produto_id and obj.produto.ncm:
            return obj.produto.ncm
        return ""

    class Meta:
        model = OrcamentoItem
        fields = (
            "id",
            "ordem",
            "tipo",
            "origem",
            "editavel",
            "configurador_painel",
            "item_origem",
            "produto",
            "produto_codigo",
            "produto_ncm",
            "descricao",
            "quantidade",
            "custo_unitario",
            "margem_percentual",
            "preco_unitario",
            "aliquota_ipi",
        )
        read_only_fields = (
            "editavel",
            "configurador_painel",
            "item_origem",
            "origem",
            "produto_codigo",
            "produto_ncm",
            "aliquota_ipi",
        )


class OrcamentoSerializer(serializers.ModelSerializer):
    """Cabeçalho da proposta com itens; normaliza preços e origem ao vincular produto."""

    itens = OrcamentoItemSerializer(many=True, required=False)
    configuradores_painel = OrcamentoConfiguradorPainelSerializer(
        many=True,
        read_only=True,
    )
    editavel = serializers.SerializerMethodField()
    cliente_nome = serializers.SerializerMethodField()
    contato_cliente_nome = serializers.SerializerMethodField()
    contato_cliente_email = serializers.SerializerMethodField()
    criado_por_label = serializers.SerializerMethodField()
    atualizado_por_label = serializers.SerializerMethodField()

    class Meta:
        model = Orcamento
        fields = (
            "id",
            "codigo",
            "codigo_base",
            "revisao",
            "tipo_revisao",
            "orcamento_origem",
            "editavel",
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
            "criado_por",
            "criado_por_label",
            "atualizado_por",
            "atualizado_por_label",
            "itens",
            "configuradores_painel",
        )
        read_only_fields = (
            "id",
            "codigo",
            "codigo_base",
            "revisao",
            "tipo_revisao",
            "orcamento_origem",
            "editavel",
            "cliente_nome",
            "contato_cliente_nome",
            "contato_cliente_email",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "criado_por_label",
            "atualizado_por",
            "atualizado_por_label",
        )

    def get_cliente_nome(self, obj):
        return obj.cliente.razao_social if obj.cliente_id else obj.cliente_referencia

    def get_contato_cliente_nome(self, obj):
        return obj.contato_cliente.nome if obj.contato_cliente_id else ""

    def get_contato_cliente_email(self, obj):
        return obj.contato_cliente.email if obj.contato_cliente_id else ""

    @staticmethod
    def _usuario_label(user) -> str:
        if user is None:
            return ""
        nome = f"{user.first_name} {user.last_name}".strip()
        if nome:
            return f"{nome} ({user.email})"
        return user.email

    def get_criado_por_label(self, obj):
        return self._usuario_label(obj.criado_por)

    def get_atualizado_por_label(self, obj):
        return self._usuario_label(obj.atualizado_por)

    def get_editavel(self, obj):
        return obj.editavel

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
        if instance and not instance.editavel:
            bloqueados = set(attrs.keys()) - {"status"}
            if bloqueados:
                raise serializers.ValidationError(
                    "Proposta fora de rascunho: apenas o status pode ser alterado."
                )
        return attrs

    def update(self, instance, validated_data):
        itens_data = validated_data.pop("itens", empty)
        self._aplicar_margens_cliente(validated_data)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user and getattr(user, "is_authenticated", False):
            validated_data["atualizado_por"] = user
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

    def _aplicar_ipi_do_catalogo(self, data) -> None:
        """IPI é sempre derivado do cadastro fiscal do produto (não editável na proposta)."""
        produto = data.get("produto")
        if produto is not None:
            data["aliquota_ipi"] = p_ipi_referencia_produto(produto)
            return
        data["aliquota_ipi"] = None

    def _preencher_item_produto_catalogo(self, data, produto: Produto) -> None:
        if data.get("tipo") == TipoItemOrcamentoChoices.SERVICO:
            raise serializers.ValidationError(
                {"itens": "Serviço não pode referenciar produto do catálogo."}
            )
        data["tipo"] = TipoItemOrcamentoChoices.PRODUTO
        data["origem"] = OrigemItemOrcamentoChoices.CATALOGO
        desc = (data.get("descricao") or "").strip()
        data["descricao"] = desc or produto.descricao
        data["custo_unitario"] = produto.preco_base

    def _limpar_produto_catalogo_item(self, data) -> None:
        data["produto"] = None
        if data.get("origem") == OrigemItemOrcamentoChoices.CATALOGO:
            data["origem"] = OrigemItemOrcamentoChoices.MANUAL

    def _normalizar_origem_tipo_item(self, data, produto, rehydrate_catalogo) -> None:
        if rehydrate_catalogo and produto is not None:
            self._preencher_item_produto_catalogo(data, produto)
            return
        data["tipo"] = data.get("tipo") or TipoItemOrcamentoChoices.PRODUTO
        data["origem"] = data.get("origem") or OrigemItemOrcamentoChoices.MANUAL

    def _preencher_valores_padrao_item(self, orcamento, data, rehydrate_catalogo) -> None:
        data["quantidade"] = data.get("quantidade", 1)
        if not rehydrate_catalogo:
            data["custo_unitario"] = data.get("custo_unitario", 0)
        if data.get("margem_percentual") in (None, "") or "margem_percentual" not in data:
            data["margem_percentual"] = self._margem_padrao_item(orcamento, data["tipo"])

    def _recalcular_preco_item(self, data) -> None:
        data["preco_unitario"] = calcular_preco_unitario_linha(
            data.get("custo_unitario") or 0,
            data.get("margem_percentual") or 0,
            data.get("aliquota_ipi"),
        )

    def _normalizar_item_data(
        self,
        orcamento,
        item_data,
        idx,
        *,
        rehydrate_catalogo=False,
        clear_produto=False,
    ):
        data = dict(item_data)
        if clear_produto:
            self._limpar_produto_catalogo_item(data)
        data["ordem"] = data.get("ordem", idx)
        produto = data.get("produto")
        self._normalizar_origem_tipo_item(data, produto, rehydrate_catalogo)
        self._preencher_valores_padrao_item(orcamento, data, rehydrate_catalogo)
        self._aplicar_ipi_do_catalogo(data)
        self._recalcular_preco_item(data)
        if not (data.get("descricao") or "").strip():
            raise serializers.ValidationError(
                {"itens": "Cada item precisa de descrição (ou produto do catálogo)."}
            )
        return data

    def _mesclar_campos_item_existente(self, orcamento, raw_in: dict) -> dict:
        raw = dict(raw_in)
        item_id = raw.get("id")
        if not item_id:
            return raw

        existing = OrcamentoItem.objects.filter(
            pk=item_id, orcamento=orcamento
        ).first()
        if not existing:
            return raw

        for field in _ORCAMENTO_ITEM_MERGE_FIELDS:
            if field not in raw_in:
                raw[field] = getattr(existing, field)
        if "produto" not in raw_in and existing.produto_id:
            raw["produto"] = existing.produto
        return raw

    def _normalize_itens_list(self, orcamento, itens_data):
        normalized = []
        for idx, raw_in in enumerate(itens_data):
            raw = self._mesclar_campos_item_existente(orcamento, raw_in)
            rehydrate = "produto" in raw_in and raw_in.get("produto") is not None
            clear_prod = "produto" in raw_in and raw_in.get("produto") is None
            normalized.append(
                self._normalizar_item_data(
                    orcamento,
                    raw,
                    idx,
                    rehydrate_catalogo=rehydrate,
                    clear_produto=clear_prod,
                )
            )
        return normalized

    def _sync_itens(self, orcamento, itens_data):
        if not orcamento.editavel:
            raise serializers.ValidationError(
                {"itens": "Não é possível alterar itens fora do rascunho."}
            )
        kept_ids = list(
            OrcamentoItem.objects.filter(orcamento=orcamento, editavel=False).values_list(
                "pk", flat=True
            )
        )
        with transaction.atomic():
            for raw in self._normalize_itens_list(orcamento, itens_data):
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
                    if not item.editavel:
                        raise serializers.ValidationError(
                            {
                                "itens": (
                                    f"O item «{item.descricao[:40]}» é histórico e não pode ser alterado."
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
                    item.produto = raw.get("produto")
                    item.aliquota_ipi = raw.get("aliquota_ipi")
                    item.save(update_fields=(
                        "ordem",
                        "tipo",
                        "origem",
                        "descricao",
                        "quantidade",
                        "custo_unitario",
                        "margem_percentual",
                        "preco_unitario",
                        "produto",
                        "aliquota_ipi",
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
                        produto=raw.get("produto"),
                        aliquota_ipi=raw.get("aliquota_ipi"),
                    )
                    kept_ids.append(novo.pk)
            OrcamentoItem.objects.filter(orcamento=orcamento, editavel=True).exclude(
                pk__in=kept_ids
            ).delete()

    def create(self, validated_data):
        itens_data = validated_data.pop("itens", [])
        validated_data.setdefault(
            "valido_ate",
            timezone.localdate() + timedelta(days=15),
        )
        self._aplicar_margens_cliente(validated_data)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user and getattr(user, "is_authenticated", False):
            validated_data["criado_por"] = user
            validated_data["atualizado_por"] = user
        with transaction.atomic():
            orcamento = Orcamento.objects.create(**validated_data)
            for raw in self._normalize_itens_list(orcamento, itens_data):
                OrcamentoItem.objects.create(
                    orcamento=orcamento,
                    ordem=raw["ordem"],
                    tipo=raw["tipo"],
                    origem=raw["origem"],
                    descricao=raw["descricao"],
                    quantidade=raw["quantidade"],
                    custo_unitario=raw["custo_unitario"],
                    margem_percentual=raw["margem_percentual"],
                    preco_unitario=raw["preco_unitario"],
                    produto=raw.get("produto"),
                    aliquota_ipi=raw.get("aliquota_ipi"),
                )
        return orcamento


class ConfiguracaoMargemClienteSerializer(serializers.ModelSerializer):
    """Leitura/escrita de margens padrão vinculadas a cliente ativo."""

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
