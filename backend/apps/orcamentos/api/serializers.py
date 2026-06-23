"""
Serializers de orçamento: itens aninhados, sync por lista e integração catálogo/fiscal.
"""
from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.serializers import empty

from apps.catalogo.models import Produto, Servico
from apps.fiscal.services import p_ipi_referencia_produto
from apps.orcamentos.models import (
    ConfiguracaoMargemCliente,
    Orcamento,
    PerfilOfertaChoices,
    OrcamentoOfertaArquivo,
    OrcamentoOfertaBloco,
    OrcamentoOfertaEnvio,
    OrcamentoSnapshot,
    OrcamentoItem,
    OrigemItemOrcamentoChoices,
    StatusOrcamentoChoices,
    TipoItemOrcamentoChoices,
)
from core.permissions import PermissionKeys

from apps.orcamentos.services.formatacao_oferta import cnpj_exibicao, endereco_exibicao_parceiro
from apps.orcamentos.services.ncm_investimento import normalizar_ncm_investimento
from apps.orcamentos.services.preco_linha import calcular_preco_unitario_linha
from apps.orcamentos.services.snapshot_orcamento import criar_snapshot_envio_orcamento
from apps.orcamentos.services.politica_preco_catalogo import (
    preco_catalogo_item_desatualizado,
    validar_finalizacao_preco_catalogo,
)

_ORCAMENTO_ITEM_MERGE_FIELDS = (
    "tipo",
    "origem",
    "descricao",
    "quantidade",
    "custo_unitario",
    "margem_percentual",
    "preco_unitario",
    "produto",
    "servico",
)

_ORIGENS_ITEM_PROTEGIDAS = frozenset(
    {
        OrigemItemOrcamentoChoices.CONFIGURADOR,
        OrigemItemOrcamentoChoices.HERANCA_REVISAO,
    }
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


class OrcamentoOfertaArquivoSerializer(serializers.ModelSerializer):
    criado_por_label = serializers.SerializerMethodField()
    download_url = serializers.SerializerMethodField()

    class Meta:
        model = OrcamentoOfertaArquivo
        fields = (
            "id",
            "tipo",
            "nome_original",
            "content_type",
            "tamanho_bytes",
            "versao",
            "criado_por",
            "criado_por_label",
            "criado_em",
            "download_url",
        )
        read_only_fields = fields

    def get_criado_por_label(self, obj):
        return OrcamentoSerializer._usuario_label(obj.criado_por)

    def get_download_url(self, obj):
        return f"/orcamentos/{obj.orcamento_id}/arquivos-oferta/{obj.id}/download/"


class OrcamentoOfertaEnvioSerializer(serializers.ModelSerializer):
    enviado_por_label = serializers.SerializerMethodField()
    pdf_final = OrcamentoOfertaArquivoSerializer(read_only=True)

    class Meta:
        model = OrcamentoOfertaEnvio
        fields = (
            "id",
            "pdf_final",
            "convite",
            "canal",
            "link_publico",
            "email_enviado",
            "email_erro",
            "destinatario_nome",
            "destinatario_email",
            "destinatario_emails",
            "assunto",
            "mensagem",
            "enviado_por",
            "enviado_por_label",
            "enviado_em",
        )
        read_only_fields = fields

    def get_enviado_por_label(self, obj):
        return OrcamentoSerializer._usuario_label(obj.enviado_por)


class OrcamentoItemSerializer(serializers.ModelSerializer):
    """Item aninhado: `id` opcional na atualização (linhas novas sem id)."""

    id = serializers.UUIDField(required=False, allow_null=True)
    descricao = serializers.CharField(max_length=500, required=False, allow_blank=True)
    produto_codigo = serializers.SerializerMethodField()
    produto_ncm = serializers.SerializerMethodField()
    painel_ref = serializers.SerializerMethodField()
    produto = serializers.PrimaryKeyRelatedField(
        queryset=Produto.objects.all(),
        required=False,
        allow_null=True,
    )
    servico = serializers.PrimaryKeyRelatedField(
        queryset=Servico.objects.filter(ativo=True),
        required=False,
        allow_null=True,
    )
    servico_codigo = serializers.SerializerMethodField()
    servico_unidade_medida = serializers.SerializerMethodField()
    servico_categoria = serializers.SerializerMethodField()
    catalogo_preco_atualizado_em = serializers.SerializerMethodField()
    catalogo_preco_desatualizado = serializers.SerializerMethodField()

    def get_produto_codigo(self, obj):
        return obj.produto.codigo if obj.produto_id else ""

    def get_produto_ncm(self, obj):
        if obj.tipo == TipoItemOrcamentoChoices.SERVICO:
            return ""
        if obj.produto_id and obj.produto.ncm:
            return obj.produto.ncm
        return ""

    def get_painel_ref(self, obj):
        if not obj.configurador_painel_id:
            return ""
        from apps.orcamentos.services.configurador_painel import rotulo_painel_ref

        return rotulo_painel_ref(obj.configurador_painel)

    def get_servico_codigo(self, obj):
        return obj.servico.codigo if obj.servico_id else ""

    def get_servico_unidade_medida(self, obj):
        return obj.servico.unidade_medida if obj.servico_id else ""

    def get_servico_categoria(self, obj):
        return obj.servico.categoria if obj.servico_id else ""

    def get_catalogo_preco_atualizado_em(self, obj):
        referencia = None
        if obj.tipo == TipoItemOrcamentoChoices.SERVICO and obj.servico_id:
            referencia = obj.servico
        elif obj.tipo == TipoItemOrcamentoChoices.PRODUTO and obj.produto_id:
            referencia = obj.produto
        if referencia is None:
            return None
        return referencia.custo_atualizado_em

    def get_catalogo_preco_desatualizado(self, obj):
        return preco_catalogo_item_desatualizado(obj)

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
            "servico",
            "servico_codigo",
            "servico_unidade_medida",
            "servico_categoria",
            "catalogo_preco_atualizado_em",
            "catalogo_preco_desatualizado",
            "painel_ref",
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
            "servico_codigo",
            "servico_unidade_medida",
            "servico_categoria",
            "catalogo_preco_atualizado_em",
            "catalogo_preco_desatualizado",
            "painel_ref",
            "aliquota_ipi",
        )


class OrcamentoSnapshotResumoSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrcamentoSnapshot
        fields = (
            "id",
            "codigo",
            "status_orcamento",
            "total",
            "gerado_em",
            "gerado_por",
            "dados",
            "itens",
        )
        read_only_fields = fields


class OrcamentoOfertaBlocoSerializer(serializers.ModelSerializer):
    id = serializers.UUIDField(required=False, allow_null=True)
    titulo = serializers.CharField(max_length=120, allow_blank=False)
    conteudo = serializers.CharField(allow_blank=True, required=False)

    class Meta:
        model = OrcamentoOfertaBloco
        fields = (
            "id",
            "ordem",
            "tipo",
            "titulo",
            "conteudo",
            "editavel",
        )
        read_only_fields = ("editavel",)


class OrcamentoRevisaoResumoSerializer(serializers.ModelSerializer):
    snapshot_envio = OrcamentoSnapshotResumoSerializer(read_only=True)

    class Meta:
        model = Orcamento
        fields = (
            "id",
            "codigo",
            "codigo_base",
            "revisao",
            "tipo_revisao",
            "status",
            "titulo",
            "criado_em",
            "atualizado_em",
            "snapshot_envio",
        )
        read_only_fields = fields


class OrcamentoSerializer(serializers.ModelSerializer):
    """Cabeçalho da proposta com itens; normaliza preços e origem ao vincular produto."""

    itens = OrcamentoItemSerializer(many=True, required=False)
    oferta_blocos = OrcamentoOfertaBlocoSerializer(many=True, required=False)
    configuradores_painel = OrcamentoConfiguradorPainelSerializer(
        many=True,
        read_only=True,
    )
    oferta_arquivos = OrcamentoOfertaArquivoSerializer(many=True, read_only=True)
    oferta_envios = OrcamentoOfertaEnvioSerializer(many=True, read_only=True)
    editavel = serializers.SerializerMethodField()
    cliente_nome = serializers.SerializerMethodField()
    contato_cliente_nome = serializers.SerializerMethodField()
    contato_cliente_email = serializers.SerializerMethodField()
    contato_cliente_telefone = serializers.SerializerMethodField()
    cliente_endereco = serializers.SerializerMethodField()
    cliente_cnpj = serializers.SerializerMethodField()
    criado_por_label = serializers.SerializerMethodField()
    atualizado_por_label = serializers.SerializerMethodField()
    snapshot_envio = serializers.SerializerMethodField()
    revisoes_derivadas = serializers.SerializerMethodField()

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
            "contato_cliente_telefone",
            "cliente_endereco",
            "cliente_cnpj",
            "cliente_referencia",
            "margem_produtos_percentual",
            "margem_servicos_percentual",
            "desconto_comercial_ativo",
            "desconto_percentual",
            "ncm_investimento",
            "investimento_descricao",
            "perfil_oferta",
            "status",
            "valido_ate",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "criado_por_label",
            "atualizado_por",
            "atualizado_por_label",
            "snapshot_envio",
            "revisoes_derivadas",
            "itens",
            "oferta_blocos",
            "oferta_arquivos",
            "oferta_envios",
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
            "contato_cliente_telefone",
            "cliente_endereco",
            "cliente_cnpj",
            "criado_em",
            "atualizado_em",
            "criado_por",
            "criado_por_label",
            "atualizado_por",
            "atualizado_por_label",
            "snapshot_envio",
            "revisoes_derivadas",
            "oferta_arquivos",
            "oferta_envios",
        )

    def get_cliente_nome(self, obj):
        return obj.cliente.razao_social if obj.cliente_id else obj.cliente_referencia

    def get_contato_cliente_nome(self, obj):
        return obj.contato_cliente.nome if obj.contato_cliente_id else ""

    def get_contato_cliente_email(self, obj):
        return obj.contato_cliente.email if obj.contato_cliente_id else ""

    def get_contato_cliente_telefone(self, obj):
        return obj.contato_cliente.telefone if obj.contato_cliente_id else ""

    def get_cliente_endereco(self, obj):
        return endereco_exibicao_parceiro(obj.cliente) if obj.cliente_id else ""

    def get_cliente_cnpj(self, obj):
        return cnpj_exibicao(obj.cliente.documento) if obj.cliente_id else ""

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

    def get_snapshot_envio(self, obj):
        try:
            snapshot = obj.snapshot_envio
        except OrcamentoSnapshot.DoesNotExist:
            return None
        return OrcamentoSnapshotResumoSerializer(snapshot).data

    def get_revisoes_derivadas(self, obj):
        revisoes = obj.revisoes_derivadas.order_by("criado_em")
        return OrcamentoRevisaoResumoSerializer(revisoes, many=True).data

    @staticmethod
    def _usuario_pode_aplicar_desconto_comercial(user) -> bool:
        if not user or not getattr(user, "is_authenticated", False):
            return False
        return PermissionKeys.ORCAMENTO_APLICAR_DESCONTO in set(
            getattr(user, "permissoes_efetivas", []) or []
        )

    def _validar_desconto_comercial(self, attrs):
        """Desconto comercial só pode ser definido/alterado com permissão dedicada."""
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if self._usuario_pode_aplicar_desconto_comercial(user):
            return attrs

        instance = self.instance
        if instance is None:
            attrs["desconto_comercial_ativo"] = False
            attrs["desconto_percentual"] = Decimal("0")
            return attrs

        erros = {}
        if (
            "desconto_comercial_ativo" in attrs
            and bool(attrs["desconto_comercial_ativo"])
            != bool(instance.desconto_comercial_ativo)
        ):
            erros["desconto_comercial_ativo"] = (
                "Sem permissão para alterar o desconto comercial da proposta."
            )
        if "desconto_percentual" in attrs:
            novo = Decimal(str(attrs["desconto_percentual"] or 0))
            antigo = Decimal(str(instance.desconto_percentual or 0))
            if novo != antigo:
                erros["desconto_percentual"] = (
                    "Sem permissão para alterar o desconto comercial da proposta."
                )
        if erros:
            raise serializers.ValidationError(erros)

        attrs.pop("desconto_comercial_ativo", None)
        attrs.pop("desconto_percentual", None)
        return attrs

    def _validar_ncm_investimento(self, attrs):
        perfil = attrs.get(
            "perfil_oferta",
            getattr(self.instance, "perfil_oferta", None) or PerfilOfertaChoices.MATERIAIS,
        )
        if perfil != PerfilOfertaChoices.SOLUCAO_COMPLETA:
            return attrs
        bruto = attrs.get(
            "ncm_investimento",
            getattr(self.instance, "ncm_investimento", None) if self.instance else None,
        )
        attrs["ncm_investimento"] = normalizar_ncm_investimento(bruto)
        ncm = attrs["ncm_investimento"]
        if len(ncm) != 8:
            raise serializers.ValidationError(
                {"ncm_investimento": "Informe o NCM com 8 dígitos (ex.: 85371090)."}
            )
        return attrs

    def _validar_investimento_descricao(self, attrs):
        perfil = attrs.get(
            "perfil_oferta",
            getattr(self.instance, "perfil_oferta", None) or PerfilOfertaChoices.MATERIAIS,
        )
        if perfil != PerfilOfertaChoices.SOLUCAO_COMPLETA:
            return attrs
        bruto = attrs.get(
            "investimento_descricao",
            getattr(self.instance, "investimento_descricao", None) if self.instance else None,
        )
        attrs["investimento_descricao"] = str(bruto or "").strip()[:255]
        return attrs

    def validate(self, attrs):
        attrs = self._validar_desconto_comercial(attrs)
        attrs = self._validar_ncm_investimento(attrs)
        attrs = self._validar_investimento_descricao(attrs)
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
        oferta_blocos_data = validated_data.pop("oferta_blocos", empty)
        status_destino = validated_data.pop("status", empty)
        status_anterior = instance.status
        self._aplicar_margens_cliente(validated_data)
        request = self.context.get("request")
        user = getattr(request, "user", None) if request else None
        if user and getattr(user, "is_authenticated", False):
            validated_data["atualizado_por"] = user
        with transaction.atomic():
            instance = super().update(instance, validated_data)
            if itens_data is not empty:
                self._sync_itens(instance, itens_data)
            if oferta_blocos_data is not empty:
                self._sync_oferta_blocos(instance, oferta_blocos_data)
            if status_destino is not empty:
                instance.status = status_destino
                instance.save(update_fields=("status", "atualizado_em"))
            if (
                status_anterior == StatusOrcamentoChoices.RASCUNHO
                and instance.status
                in (
                    StatusOrcamentoChoices.FINALIZADO,
                    StatusOrcamentoChoices.ENVIADO,
                )
            ):
                try:
                    validar_finalizacao_preco_catalogo(instance)
                    criar_snapshot_envio_orcamento(instance, usuario=user)
                except ValueError as exc:
                    raise serializers.ValidationError({"status": str(exc)}) from exc
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
        data["servico"] = None
        desc = (data.get("descricao") or "").strip()
        data["descricao"] = desc or produto.descricao
        data["custo_unitario"] = produto.custo_referencia

    def _preencher_item_servico_catalogo(self, data, servico: Servico) -> None:
        if data.get("tipo") == TipoItemOrcamentoChoices.PRODUTO:
            raise serializers.ValidationError(
                {"itens": "Produto não pode referenciar serviço do catálogo."}
            )
        data["tipo"] = TipoItemOrcamentoChoices.SERVICO
        data["origem"] = OrigemItemOrcamentoChoices.CATALOGO
        data["produto"] = None
        desc = (data.get("descricao") or "").strip()
        data["descricao"] = desc or servico.descricao
        data["custo_unitario"] = servico.custo_referencia

    def _limpar_produto_catalogo_item(self, data) -> None:
        data["produto"] = None
        if data.get("origem") == OrigemItemOrcamentoChoices.CATALOGO:
            data["origem"] = OrigemItemOrcamentoChoices.MANUAL

    def _limpar_servico_catalogo_item(self, data) -> None:
        data["servico"] = None
        if data.get("origem") == OrigemItemOrcamentoChoices.CATALOGO:
            data["origem"] = OrigemItemOrcamentoChoices.MANUAL

    def _normalizar_origem_tipo_item(
        self,
        data,
        produto,
        servico,
        rehydrate_catalogo,
    ) -> None:
        origem = data.get("origem")
        if rehydrate_catalogo and produto is not None:
            if origem in _ORIGENS_ITEM_PROTEGIDAS:
                data["tipo"] = data.get("tipo") or TipoItemOrcamentoChoices.PRODUTO
                return
            self._preencher_item_produto_catalogo(data, produto)
            return
        if rehydrate_catalogo and servico is not None:
            self._preencher_item_servico_catalogo(data, servico)
            return
        if produto is not None and data.get("tipo") == TipoItemOrcamentoChoices.SERVICO:
            raise serializers.ValidationError(
                {"itens": "Serviço não pode referenciar produto do catálogo."}
            )
        if servico is not None and data.get("tipo") == TipoItemOrcamentoChoices.PRODUTO:
            raise serializers.ValidationError(
                {"itens": "Produto não pode referenciar serviço do catálogo."}
            )
        data["tipo"] = data.get("tipo") or TipoItemOrcamentoChoices.PRODUTO
        data["origem"] = origem or OrigemItemOrcamentoChoices.MANUAL

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
        clear_servico=False,
    ):
        data = dict(item_data)
        if clear_produto:
            self._limpar_produto_catalogo_item(data)
        data["ordem"] = data.get("ordem", idx)
        produto = data.get("produto")
        servico = data.get("servico")
        if clear_produto:
            produto = None
        if clear_servico:
            self._limpar_servico_catalogo_item(data)
            servico = None
        self._normalizar_origem_tipo_item(data, produto, servico, rehydrate_catalogo)
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
        if "servico" not in raw_in and existing.servico_id:
            raw["servico"] = existing.servico
        return raw

    def _normalize_itens_list(self, orcamento, itens_data):
        normalized = []
        for idx, raw_in in enumerate(itens_data):
            raw = self._mesclar_campos_item_existente(orcamento, raw_in)
            origem_in = raw.get("origem")
            tem_produto = "produto" in raw_in and raw_in.get("produto") is not None
            tem_servico = "servico" in raw_in and raw_in.get("servico") is not None
            rehydrate = (tem_produto or tem_servico) and origem_in not in _ORIGENS_ITEM_PROTEGIDAS
            clear_prod = "produto" in raw_in and raw_in.get("produto") is None
            clear_serv = "servico" in raw_in and raw_in.get("servico") is None
            normalized.append(
                self._normalizar_item_data(
                    orcamento,
                    raw,
                    idx,
                    rehydrate_catalogo=rehydrate,
                    clear_produto=clear_prod,
                    clear_servico=clear_serv,
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
                        kept_ids.append(item.pk)
                        continue
                    item.ordem = ordem
                    item.tipo = raw["tipo"]
                    item.origem = raw["origem"]
                    item.descricao = descricao
                    item.quantidade = raw["quantidade"]
                    item.custo_unitario = raw["custo_unitario"]
                    item.margem_percentual = raw["margem_percentual"]
                    item.preco_unitario = raw["preco_unitario"]
                    item.produto = raw.get("produto")
                    item.servico = raw.get("servico")
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
                        "servico",
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
                        servico=raw.get("servico"),
                        aliquota_ipi=raw.get("aliquota_ipi"),
                    )
                    kept_ids.append(novo.pk)
            OrcamentoItem.objects.filter(orcamento=orcamento, editavel=True).exclude(
                pk__in=kept_ids
            ).delete()

    def _sync_oferta_blocos(self, orcamento, blocos_data):
        if not orcamento.editavel:
            raise serializers.ValidationError(
                {"oferta_blocos": "Não é possível alterar textos da oferta fora do rascunho."}
            )
        kept_ids = list(
            OrcamentoOfertaBloco.objects.filter(orcamento=orcamento, editavel=False).values_list(
                "pk", flat=True
            )
        )
        with transaction.atomic():
            for idx, raw in enumerate(blocos_data):
                bloco_id = raw.get("id")
                dados = {
                    "ordem": raw.get("ordem", idx),
                    "tipo": raw["tipo"],
                    "titulo": raw["titulo"].strip(),
                    "conteudo": raw.get("conteudo", ""),
                }
                if bloco_id:
                    bloco = OrcamentoOfertaBloco.objects.filter(
                        pk=bloco_id,
                        orcamento=orcamento,
                    ).first()
                    if bloco is None:
                        raise serializers.ValidationError(
                            {
                                "oferta_blocos": (
                                    f"Bloco com id {bloco_id} não existe neste orçamento."
                                )
                            }
                        )
                    if not bloco.editavel:
                        kept_ids.append(bloco.pk)
                        continue
                    for campo, valor in dados.items():
                        setattr(bloco, campo, valor)
                    bloco.save(update_fields=("ordem", "tipo", "titulo", "conteudo"))
                    kept_ids.append(bloco.pk)
                else:
                    novo = OrcamentoOfertaBloco.objects.create(orcamento=orcamento, **dados)
                    kept_ids.append(novo.pk)
            OrcamentoOfertaBloco.objects.filter(orcamento=orcamento, editavel=True).exclude(
                pk__in=kept_ids
            ).delete()

    def create(self, validated_data):
        itens_data = validated_data.pop("itens", [])
        oferta_blocos_data = validated_data.pop("oferta_blocos", [])
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
                    servico=raw.get("servico"),
                    aliquota_ipi=raw.get("aliquota_ipi"),
                )
            self._sync_oferta_blocos(orcamento, oferta_blocos_data)
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
