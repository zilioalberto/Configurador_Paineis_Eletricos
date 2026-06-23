"""Serializers de obrigações fiscais mensais."""
from __future__ import annotations

from decimal import Decimal

from rest_framework import serializers

from apps.fiscal.models_obrigacoes import (
    AnexoObrigacaoFiscal,
    HoleriteCompetencia,
    LancamentoFinanceiroImposto,
    LinhaComposicaoObrigacao,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
    ReconciliacaoFiscal,
    SnapshotApuracaoIcms,
)
from apps.fiscal.choices import TipoObrigacaoFiscalChoices
from apps.fiscal.services.obrigacoes.das_simples import (
    aplicar_linhas_composicao_obrigacao,
    das_importado_de_pdf,
    garantir_obrigacao_das_editavel,
)
from apps.rh.models import Colaborador


class LinhaComposicaoObrigacaoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LinhaComposicaoObrigacao
        fields = ("id", "codigo", "descricao", "valor")


class LancamentoFinanceiroImpostoSerializer(serializers.ModelSerializer):
    class Meta:
        model = LancamentoFinanceiroImposto
        fields = (
            "public_id",
            "valor",
            "data",
            "conta",
            "centro_custo",
            "observacoes",
            "criado_em",
        )
        read_only_fields = fields


class ObrigacaoFiscalSerializer(serializers.ModelSerializer):
    linhas_composicao = LinhaComposicaoObrigacaoSerializer(many=True, read_only=True)
    lancamento_financeiro = LancamentoFinanceiroImpostoSerializer(read_only=True)
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model = ObrigacaoFiscal
        fields = (
            "public_id",
            "tipo",
            "tipo_label",
            "descricao",
            "valor",
            "valor_estimado",
            "data_vencimento",
            "data_pagamento",
            "status",
            "status_label",
            "numero_documento",
            "observacoes",
            "dados_extra",
            "linhas_composicao",
            "lancamento_financeiro",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = (
            "public_id",
            "tipo_label",
            "status_label",
            "linhas_composicao",
            "lancamento_financeiro",
            "criado_em",
            "atualizado_em",
        )


class LinhaComposicaoInputSerializer(serializers.Serializer):
    codigo = serializers.CharField(max_length=10)
    descricao = serializers.CharField(max_length=255, required=False, allow_blank=True, default="")
    valor = serializers.DecimalField(max_digits=14, decimal_places=2, min_value=Decimal("0.01"))


class ObrigacaoFiscalUpdateSerializer(serializers.ModelSerializer):
    linhas_composicao = LinhaComposicaoInputSerializer(many=True, required=False)

    class Meta:
        model = ObrigacaoFiscal
        fields = (
            "descricao",
            "valor",
            "data_vencimento",
            "data_pagamento",
            "status",
            "numero_documento",
            "observacoes",
            "linhas_composicao",
        )

    def validate(self, attrs):
        instance = self.instance
        if instance and instance.tipo == TipoObrigacaoFiscalChoices.DAS and das_importado_de_pdf(instance.pacote):
            campos_pdf = {"valor", "descricao", "numero_documento", "linhas_composicao"}
            bloqueados = campos_pdf & attrs.keys()
            if bloqueados:
                labels = ", ".join(sorted(bloqueados))
                raise serializers.ValidationError(
                    f"O DAS é definido pelo PDF Simples Nacional importado ({labels}). "
                    "Reimporte um PDF pesquisável para alterar valor ou composição."
                )
        return attrs

    def update(self, instance, validated_data):
        linhas = validated_data.pop("linhas_composicao", None)
        instance = super().update(instance, validated_data)

        if instance.tipo == TipoObrigacaoFiscalChoices.DAS:
            if das_importado_de_pdf(instance.pacote):
                return instance
            if linhas is not None:
                aplicar_linhas_composicao_obrigacao(instance, linhas, fonte="manual")
            elif "valor" in validated_data and Decimal(str(validated_data["valor"])) > 0:
                extra = dict(instance.dados_extra or {})
                extra["fonte_valor"] = "manual"
                instance.dados_extra = extra
                instance.save(update_fields=["dados_extra", "atualizado_em"])
            return instance

        if "valor" in validated_data and Decimal(str(validated_data["valor"])) > 0:
            extra = dict(instance.dados_extra or {})
            extra["fonte_valor"] = "manual"
            instance.dados_extra = extra
            instance.save(update_fields=["dados_extra", "atualizado_em"])
        return instance


class AnexoObrigacaoFiscalSerializer(serializers.ModelSerializer):
    arquivo_url = serializers.SerializerMethodField()

    class Meta:
        model = AnexoObrigacaoFiscal
        fields = (
            "public_id",
            "tipo_arquivo",
            "nome_original",
            "arquivo_url",
            "parse_sucesso",
            "parse_erros",
            "parsed_data",
            "criado_em",
        )
        read_only_fields = fields

    def get_arquivo_url(self, obj) -> str | None:
        request = self.context.get("request")
        if not obj.arquivo:
            return None
        if request:
            return request.build_absolute_uri(obj.arquivo.url)
        return obj.arquivo.url


class HoleriteCompetenciaSerializer(serializers.ModelSerializer):
    colaborador_id = serializers.UUIDField(source="colaborador.id", read_only=True, allow_null=True)
    colaborador_nome = serializers.CharField(source="colaborador.nome", read_only=True, default="")
    colaborador_matricula = serializers.CharField(source="colaborador.matricula", read_only=True, default="")
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)
    vinculo_rh = serializers.SerializerMethodField()
    valores_aplicados = serializers.SerializerMethodField()
    aviso_rh = serializers.SerializerMethodField()
    colaborador_sugerido_id = serializers.SerializerMethodField()
    colaborador_sugerido_nome = serializers.SerializerMethodField()
    valores_pendentes = serializers.SerializerMethodField()

    class Meta:
        model = HoleriteCompetencia
        fields = (
            "id",
            "cpf",
            "nome",
            "tipo",
            "tipo_label",
            "proventos",
            "desconto_inss",
            "base_fgts",
            "fgts_mes",
            "total_liquido",
            "colaborador_id",
            "colaborador_nome",
            "colaborador_matricula",
            "vinculo_rh",
            "valores_aplicados",
            "aviso_rh",
            "colaborador_sugerido_id",
            "colaborador_sugerido_nome",
            "valores_pendentes",
        )
        read_only_fields = fields

    def get_vinculo_rh(self, obj) -> str:
        if obj.colaborador_id and self.get_valores_aplicados(obj):
            return "VINCULADO"
        if obj.colaborador_id:
            return "VINCULADO"
        extra = obj.dados_extra or {}
        if extra.get("colaborador_sugerido_id"):
            return "SUGESTAO"
        return "PENDENTE"

    def get_valores_aplicados(self, obj) -> bool:
        extra = obj.dados_extra or {}
        if extra.get("valores_aplicados") is False:
            return False
        if extra.get("valores_aplicados") is True:
            return True
        return bool(obj.colaborador_id and (obj.proventos or obj.desconto_inss or obj.fgts_mes))

    def get_aviso_rh(self, obj) -> str:
        return str((obj.dados_extra or {}).get("aviso_rh") or "")

    def get_colaborador_sugerido_id(self, obj) -> str | None:
        return (obj.dados_extra or {}).get("colaborador_sugerido_id")

    def get_colaborador_sugerido_nome(self, obj) -> str:
        return str((obj.dados_extra or {}).get("colaborador_sugerido_nome") or "")

    def get_valores_pendentes(self, obj) -> dict | None:
        pendentes = (obj.dados_extra or {}).get("valores_pendentes")
        return pendentes if isinstance(pendentes, dict) else None


class HoleriteCompetenciaUpdateSerializer(serializers.ModelSerializer):
    colaborador_id = serializers.UUIDField(required=False, allow_null=True)

    class Meta:
        model = HoleriteCompetencia
        fields = (
            "nome",
            "cpf",
            "tipo",
            "proventos",
            "desconto_inss",
            "base_fgts",
            "fgts_mes",
            "total_liquido",
            "colaborador_id",
        )

    def validate_colaborador_id(self, value):
        if value is None:
            return None
        if not Colaborador.objects.filter(id=value).exists():
            raise serializers.ValidationError("Colaborador não encontrado.")
        return value

    def update(self, instance, validated_data):
        from apps.fiscal.services.obrigacoes.holerites_rh import vincular_holerite

        colaborador_id = validated_data.pop("colaborador_id", serializers.empty)
        instance = super().update(instance, validated_data)
        if colaborador_id is not serializers.empty:
            if colaborador_id is None:
                instance.colaborador = None
                extra = dict(instance.dados_extra or {})
                extra["valores_aplicados"] = False
                extra["aviso_rh"] = "Selecione o colaborador correto do RH para aplicar os valores do PDF."
                instance.dados_extra = extra
                instance.save(update_fields=["colaborador", "dados_extra"])
            else:
                colaborador = Colaborador.objects.get(id=colaborador_id)
                vincular_holerite(instance, colaborador)
                instance.refresh_from_db()
        return instance


class SnapshotApuracaoIcmsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SnapshotApuracaoIcms
        fields = (
            "saldo_credor_anterior",
            "debitos_saidas",
            "creditos_entradas",
            "total_debitos",
            "total_creditos",
            "saldo_credor",
            "imposto_a_recolher",
            "valor_contabil_entradas",
            "valor_contabil_saidas",
            "dados_quadros",
        )
        read_only_fields = fields


class ReconciliacaoFiscalSerializer(serializers.ModelSerializer):
    tipo_label = serializers.CharField(source="get_tipo_display", read_only=True)
    status_label = serializers.CharField(source="get_status_display", read_only=True)
    fonte_contabilidade = serializers.SerializerMethodField()
    editavel = serializers.SerializerMethodField()

    class Meta:
        model = ReconciliacaoFiscal
        fields = (
            "tipo",
            "tipo_label",
            "valor_interno",
            "valor_contabilidade",
            "diferenca",
            "diferenca_percentual",
            "status",
            "status_label",
            "mensagem",
            "detalhes",
            "fonte_contabilidade",
            "editavel",
            "atualizado_em",
        )
        read_only_fields = fields

    def get_fonte_contabilidade(self, obj) -> str:
        return str((obj.detalhes or {}).get("fonte_contabilidade") or "")

    def get_editavel(self, obj) -> bool:
        from apps.fiscal.services.obrigacoes.contabilidade_manual import (
            TIPOS_EDITAVEIS,
            contabilidade_bloqueada_por_pdf,
        )

        if obj.tipo not in TIPOS_EDITAVEIS:
            return False
        pacote = obj.pacote
        return not contabilidade_bloqueada_por_pdf(pacote, obj.tipo)


class ReconciliacaoContabilidadeUpdateSerializer(serializers.Serializer):
    valor_contabilidade = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    icms_entradas = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    icms_saidas = serializers.DecimalField(
        max_digits=14,
        decimal_places=2,
        required=False,
        allow_null=True,
    )
    limpar = serializers.BooleanField(required=False, default=False)


class PacoteObrigacaoFiscalListSerializer(serializers.ModelSerializer):
    total_obrigacoes = serializers.IntegerField(read_only=True)
    total_pendente = serializers.DecimalField(
        max_digits=14, decimal_places=2, read_only=True, allow_null=True
    )

    class Meta:
        model = PacoteObrigacaoFiscal
        fields = (
            "public_id",
            "competencia",
            "recebido_em",
            "pacote_completo",
            "observacoes",
            "total_obrigacoes",
            "total_pendente",
            "criado_em",
        )
        read_only_fields = fields


class PacoteObrigacaoFiscalDetailSerializer(serializers.ModelSerializer):
    obrigacoes = ObrigacaoFiscalSerializer(many=True, read_only=True)
    anexos = AnexoObrigacaoFiscalSerializer(many=True, read_only=True)
    holerites = HoleriteCompetenciaSerializer(many=True, read_only=True)
    reconciliacoes = ReconciliacaoFiscalSerializer(many=True, read_only=True)
    snapshot_icms = SnapshotApuracaoIcmsSerializer(read_only=True)

    class Meta:
        model = PacoteObrigacaoFiscal
        fields = (
            "public_id",
            "cnpj",
            "competencia",
            "recebido_em",
            "pacote_completo",
            "observacoes",
            "obrigacoes",
            "anexos",
            "holerites",
            "reconciliacoes",
            "snapshot_icms",
            "criado_em",
            "atualizado_em",
        )
        read_only_fields = fields


class CriarPacoteSerializer(serializers.Serializer):
    competencia = serializers.RegexField(regex=r"^\d{4}-\d{2}$")
    observacoes = serializers.CharField(required=False, allow_blank=True, default="")


class UploadAnexoPacoteSerializer(serializers.Serializer):
    arquivo = serializers.FileField()
    tipo_forcado = serializers.CharField(required=False, allow_blank=True, default="")


class MarcarPagoSerializer(serializers.Serializer):
    data_pagamento = serializers.DateField(required=False)
    criar_lancamento_financeiro = serializers.BooleanField(default=True)
    conta = serializers.CharField(default="Impostos", allow_blank=True)
    centro_custo = serializers.CharField(default="Administrativo", allow_blank=True)
