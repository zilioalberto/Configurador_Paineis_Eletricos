from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ObjectDoesNotExist, ValidationError as DjangoValidationError
from django.db.models import Sum
from rest_framework import serializers

from core.choices import TipoUsuarioChoices
from core.permissions import PermissionKeys
from apps.tarefas.api.apontamento_validacao import (
    resolver_colaborador_apontamento,
    usuario_ignora_validacao_jornada,
    validar_jornada_apontamento,
)
from apps.tarefas.models import (
    ApontamentoHora,
    ChecklistTarefa,
    ColunaTarefa,
    ComentarioTarefa,
    HistoricoTarefa,
    QuadroTarefa,
    SessaoTrabalhoTarefa,
    StatusAprovacaoHoraChoices,
    Tarefa,
    TipoTarefaChoices,
)
from apps.tarefas.models.tarefa import _status_from_coluna

User = get_user_model()


def _user_label(user):
    if not user:
        return None
    nome = f"{user.first_name} {user.last_name}".strip()
    return nome or user.email


class QuadroTarefaSerializer(serializers.ModelSerializer):
    total_tarefas = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = QuadroTarefa
        fields = "__all__"
        read_only_fields = ("criado_por",)


class ColunaTarefaSerializer(serializers.ModelSerializer):
    status_semantico_display = serializers.CharField(
        source="get_status_semantico_display", read_only=True
    )

    class Meta:
        model = ColunaTarefa
        fields = "__all__"


class TarefaSerializer(serializers.ModelSerializer):
    responsavel_nome = serializers.SerializerMethodField()
    colaboradores_nomes = serializers.SerializerMethodField()
    criador_nome = serializers.SerializerMethodField()
    pode_excluir = serializers.SerializerMethodField()
    total_horas_apontadas = serializers.SerializerMethodField()
    coluna_nome = serializers.CharField(source="coluna.nome", read_only=True)
    quadro = serializers.UUIDField(source="coluna.quadro_id", read_only=True)
    prioridade_display = serializers.CharField(source="get_prioridade_display", read_only=True)
    status_display = serializers.CharField(source="get_status_display", read_only=True)
    tipo_etapa_display = serializers.CharField(source="get_tipo_etapa_display", read_only=True)
    referencia_vinculo = serializers.CharField(read_only=True)
    pode_iniciar = serializers.BooleanField(read_only=True)
    pode_receber_apontamento = serializers.BooleanField(read_only=True)

    class Meta:
        model = Tarefa
        fields = "__all__"
        read_only_fields = ("criador", "status", "concluida_em")

    def validate(self, attrs):
        instance = self.instance or Tarefa()
        campos_classificacao = {
            "tipo_etapa",
            "proposta_referencia",
            "ordem_producao_referencia",
        }

        if self.instance is not None and campos_classificacao.intersection(attrs):
            alterou_classificacao = any(
                getattr(self.instance, campo) != attrs.get(campo, getattr(self.instance, campo))
                for campo in campos_classificacao
            )
            if alterou_classificacao and self.instance.apontamentos.exists():
                request = self.context.get("request")
                user = getattr(request, "user", None)
                permissoes = set(getattr(user, "permissoes_efetivas", []) or [])
                if PermissionKeys.TAREFA_ALTERAR_CLASSIFICACAO_COM_APONTAMENTOS not in permissoes:
                    raise serializers.ValidationError(
                        {
                            "tipo_etapa": (
                                "Nao altere a classificacao de tarefas que ja possuem "
                                "apontamentos."
                            )
                        }
                    )

        for campo, valor in attrs.items():
            if campo != "colaboradores":
                setattr(instance, campo, valor)
        if getattr(instance, "coluna", None) is not None:
            instance.status = _status_from_coluna(instance.coluna)

        try:
            instance.validar_classificacao()
        except DjangoValidationError as exc:
            raise serializers.ValidationError(exc.message_dict) from exc
        return attrs

    def get_responsavel_nome(self, obj):
        return _user_label(obj.responsavel)

    def get_pode_excluir(self, obj):
        request = self.context.get("request")
        user = getattr(request, "user", None)
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser or getattr(user, "tipo_usuario", None) == TipoUsuarioChoices.ADMIN:
            return True
        permissoes = set(getattr(user, "permissoes_efetivas", []) or [])
        return PermissionKeys.TAREFA_EXCLUIR in permissoes

    def get_colaboradores_nomes(self, obj):
        return [_user_label(colaborador) for colaborador in obj.colaboradores.all()]

    def get_criador_nome(self, obj):
        return _user_label(obj.criador)

    def get_total_horas_apontadas(self, obj):
        total = getattr(obj, "total_horas_apontadas", None)
        if total is None:
            request = self.context.get("request")
            user = getattr(request, "user", None) if request else None
            if user and user.is_authenticated:
                agg = (
                    obj.apontamentos.filter(colaborador=user)
                    .exclude(
                        status_aprovacao__in=(
                            StatusAprovacaoHoraChoices.REJEITADO,
                            StatusAprovacaoHoraChoices.CANCELADO,
                            StatusAprovacaoHoraChoices.REPROVADO,
                        )
                    )
                    .aggregate(s=Sum("horas"))["s"]
                )
                total = agg if agg is not None else Decimal("0.00")
            else:
                total = Decimal("0.00")
        return f"{total:.2f}"


class TarefaKanbanSerializer(TarefaSerializer):
    class Meta(TarefaSerializer.Meta):
        fields = (
            "id",
            "titulo",
            "descricao",
            "coluna",
            "responsavel",
            "responsavel_nome",
            "colaboradores",
            "colaboradores_nomes",
            "criador",
            "criador_nome",
            "prioridade",
            "prioridade_display",
            "prazo",
            "status",
            "status_display",
            "tipo_etapa",
            "tipo_etapa_display",
            "referencia_vinculo",
            "pode_iniciar",
            "pode_receber_apontamento",
            "pode_excluir",
            "proposta_referencia",
            "ordem_producao_referencia",
            "horas_estipuladas",
            "ordem",
            "concluida_em",
            "total_horas_apontadas",
        )


class ColunaKanbanSerializer(ColunaTarefaSerializer):
    tarefas = TarefaKanbanSerializer(many=True, read_only=True)

    class Meta(ColunaTarefaSerializer.Meta):
        fields = (
            "id",
            "quadro",
            "nome",
            "ordem",
            "status_semantico",
            "status_semantico_display",
            "limite_wip",
            "tarefas",
        )


class QuadroKanbanSerializer(QuadroTarefaSerializer):
    colunas = ColunaKanbanSerializer(many=True, read_only=True)

    class Meta(QuadroTarefaSerializer.Meta):
        fields = (
            "id",
            "nome",
            "descricao",
            "equipe",
            "ativo",
            "total_tarefas",
            "colunas",
        )


class MoverTarefaSerializer(serializers.Serializer):
    coluna_id = serializers.UUIDField()
    ordem = serializers.IntegerField(min_value=0, required=False)

    def validate_coluna_id(self, value):
        try:
            return ColunaTarefa.objects.get(pk=value)
        except ColunaTarefa.DoesNotExist as exc:
            raise serializers.ValidationError("Coluna de destino nao encontrada.") from exc


class ClassificarTarefaSerializer(serializers.Serializer):
    tipo_etapa = serializers.ChoiceField(choices=TipoTarefaChoices.choices)
    proposta_referencia = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )
    ordem_producao_referencia = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=100,
    )
    horas_estipuladas = serializers.DecimalField(
        max_digits=7,
        decimal_places=2,
        required=False,
        allow_null=True,
    )


class ComentarioTarefaSerializer(serializers.ModelSerializer):
    autor_nome = serializers.SerializerMethodField()

    class Meta:
        model = ComentarioTarefa
        fields = "__all__"
        read_only_fields = ("autor",)

    def get_autor_nome(self, obj):
        return _user_label(obj.autor)


class ChecklistTarefaSerializer(serializers.ModelSerializer):
    concluido_por_nome = serializers.SerializerMethodField()

    class Meta:
        model = ChecklistTarefa
        fields = "__all__"
        read_only_fields = ("concluido_por", "concluido_em")

    def get_concluido_por_nome(self, obj):
        return _user_label(obj.concluido_por)


class ApontamentoHoraSerializer(serializers.ModelSerializer):
    colaborador = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(is_active=True),
        required=False,
    )
    colaborador_nome = serializers.SerializerMethodField()
    aprovado_por_nome = serializers.SerializerMethodField()
    sessao_id = serializers.SerializerMethodField()
    sessao_iniciado_em = serializers.SerializerMethodField()
    sessao_finalizado_em = serializers.SerializerMethodField()
    horas_calculadas = serializers.DecimalField(max_digits=5, decimal_places=2, read_only=True)
    custo_total = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)

    class Meta:
        model = ApontamentoHora
        fields = (
            "id",
            "criado_em",
            "atualizado_em",
            "tarefa",
            "colaborador",
            "colaborador_nome",
            "data",
            "horas",
            "hora_inicio",
            "hora_fim",
            "horas_calculadas",
            "etapa",
            "observacoes",
            "origem",
            "status_aprovacao",
            "valor_hora_snapshot",
            "custo_total",
            "justificativa_ajuste",
            "aprovado_por",
            "aprovado_por_nome",
            "aprovado_em",
            "sessao_id",
            "sessao_iniciado_em",
            "sessao_finalizado_em",
        )
        read_only_fields = (
            "aprovado_por",
            "aprovado_em",
            "sessao_id",
            "sessao_iniciado_em",
            "sessao_finalizado_em",
            "horas_calculadas",
            "custo_total",
        )

    def get_colaborador_nome(self, obj):
        return _user_label(obj.colaborador)

    def get_aprovado_por_nome(self, obj):
        return _user_label(obj.aprovado_por)

    def _sessao_trabalho(self, obj):
        try:
            return obj.sessao_trabalho
        except ObjectDoesNotExist:
            return None

    def get_sessao_id(self, obj):
        sessao = self._sessao_trabalho(obj)
        return sessao.id if sessao else None

    def get_sessao_iniciado_em(self, obj):
        sessao = self._sessao_trabalho(obj)
        return sessao.iniciado_em if sessao else None

    def get_sessao_finalizado_em(self, obj):
        sessao = self._sessao_trabalho(obj)
        return sessao.finalizado_em if sessao else None

    def validate(self, attrs):
        request = self.context.get("request")
        user = getattr(request, "user", None)

        if usuario_ignora_validacao_jornada(user):
            return attrs

        colaborador = resolver_colaborador_apontamento(attrs, self.instance, user)
        if colaborador is None:
            return attrs

        validar_jornada_apontamento(colaborador, attrs, self.instance)
        return attrs


class SessaoTrabalhoTarefaSerializer(serializers.ModelSerializer):
    tarefa_titulo = serializers.CharField(source="tarefa.titulo", read_only=True)
    colaborador_nome = serializers.SerializerMethodField()
    duracao_segundos = serializers.SerializerMethodField()

    class Meta:
        model = SessaoTrabalhoTarefa
        fields = (
            "id",
            "tarefa",
            "tarefa_titulo",
            "colaborador",
            "colaborador_nome",
            "iniciado_em",
            "finalizado_em",
            "etapa",
            "observacoes",
            "origem",
            "motivo_encerramento",
            "apontamento",
            "duracao_segundos",
        )
        read_only_fields = fields

    def get_colaborador_nome(self, obj):
        return _user_label(obj.colaborador)

    def get_duracao_segundos(self, obj):
        return obj.duracao_segundos()


class HistoricoTarefaSerializer(serializers.ModelSerializer):
    usuario_nome = serializers.SerializerMethodField()
    tipo_display = serializers.CharField(source="get_tipo_display", read_only=True)

    class Meta:
        model = HistoricoTarefa
        fields = "__all__"
        read_only_fields = (
            "id",
            "tarefa",
            "usuario",
            "tipo",
            "descricao",
            "dados",
            "coluna_origem",
            "coluna_destino",
            "responsavel_anterior",
            "responsavel_novo",
            "prazo_anterior",
            "prazo_novo",
            "criado_em",
            "atualizado_em",
        )

    def get_usuario_nome(self, obj):
        return _user_label(obj.usuario)
