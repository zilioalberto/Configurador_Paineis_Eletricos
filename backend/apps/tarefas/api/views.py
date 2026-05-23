from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import IntegrityError, transaction
from django.db.models import Q, Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from apps.accounts.api.permissions import HasEffectivePermission
from core.choices import TipoUsuarioChoices
from core.permissions import PermissionKeys
from apps.tarefas.api.serializers import (
    ApontamentoHoraSerializer,
    ChecklistTarefaSerializer,
    ColunaTarefaSerializer,
    ComentarioTarefaSerializer,
    HistoricoTarefaSerializer,
    ClassificarTarefaSerializer,
    MoverTarefaSerializer,
    QuadroKanbanSerializer,
    QuadroTarefaSerializer,
    SessaoTrabalhoTarefaSerializer,
    TarefaSerializer,
)
from apps.tarefas.models import (
    ApontamentoHora,
    ChecklistTarefa,
    ColunaTarefa,
    ComentarioTarefa,
    HistoricoTarefa,
    MotivoEncerramentoSessaoChoices,
    OrigemApontamentoHoraChoices,
    QuadroTarefa,
    SessaoTrabalhoTarefa,
    StatusAprovacaoHoraChoices,
    StatusSemanticoColunaChoices,
    StatusTarefaChoices,
    Tarefa,
    TipoHistoricoTarefaChoices,
    TipoTarefaChoices,
)
from apps.tarefas.selectors.kanban import (
    quadro_kanban_queryset,
    quadros_ativos_queryset,
    tarefa_acessivel_usuario_q,
    tarefas_com_total_horas_queryset,
)
from apps.tarefas.services.historico import registrar_historico_tarefa
from apps.tarefas.services.jornada_apontamento import (
    deve_encerrar_sessao_por_jornada,
    max_finalizado_em_valido_na_sessao,
    obter_jornada_do_usuario,
    previsao_fim_segmento_sessao,
    usuario_pode_iniciar_cronometro_agora,
)
from apps.tarefas.services.kanban import mover_tarefa
from apps.tarefas.services.quadro_padrao import garantir_quadro_padrao_tarefas
from apps.tarefas.services.relatorio_horas_gestao import (
    listar_colaboradores_com_apontamentos_no_periodo,
    montar_relatorio_horas_gestao,
)


def _usuario_pode_visualizar_todas_tarefas(user):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or getattr(user, "tipo_usuario", None) == TipoUsuarioChoices.ADMIN:
        return True
    permissoes = set(getattr(user, "permissoes_efetivas", []) or [])
    return (
        PermissionKeys.TAREFA_VISUALIZAR_TODAS in permissoes
        or PermissionKeys.TAREFA_GERENCIAR_QUADRO in permissoes
    )


def _usuario_tem_permissao(user, permissao):
    if not user or not user.is_authenticated:
        return False
    if user.is_superuser or getattr(user, "tipo_usuario", None) == TipoUsuarioChoices.ADMIN:
        return True
    return permissao in set(getattr(user, "permissoes_efetivas", []) or [])


def _usuario_pode_visualizar_equipe(user):
    return _usuario_tem_permissao(user, PermissionKeys.TAREFA_VISUALIZAR_EQUIPE)


def _somente_tarefas_do_usuario(user):
    return not _usuario_pode_visualizar_todas_tarefas(user)


def _apontamento_acessivel_usuario_q(user):
    return (
        Q(tarefa__responsavel=user)
        | Q(tarefa__colaboradores=user)
        | Q(tarefa__criador=user)
    )


def _usuario_tem_acesso_tarefa(user, tarefa):
    if not _somente_tarefas_do_usuario(user):
        return True
    if (
        tarefa.responsavel_id == user.id
        or tarefa.criador_id == user.id
    ):
        return True
    return tarefa.colaboradores.filter(pk=user.pk).exists()


def _usuario_envolvido_na_tarefa(user, tarefa):
    """Responsável, criador ou colaborador designado na tarefa."""
    if not user or not user.is_authenticated:
        return False
    uid = user.pk
    if tarefa.responsavel_id == uid:
        return True
    if tarefa.criador_id == uid:
        return True
    return tarefa.colaboradores.filter(pk=uid).exists()


def _usuario_pode_classificar_tarefa(user, tarefa):
    """Permissão global ou integrante da tarefa (ex.: colaborador marcado na criação)."""
    if _usuario_tem_permissao(user, PermissionKeys.TAREFA_CLASSIFICAR):
        return True
    return _usuario_envolvido_na_tarefa(user, tarefa)


class PodeClassificarTarefaObjeto(permissions.BasePermission):
    """Para POST /classificar/: exige permissão global ou envolvimento na tarefa."""

    message = "Sem permissao para classificar esta tarefa."

    def has_permission(self, request, view):
        return True

    def has_object_permission(self, request, view, obj):
        if getattr(view, "action", None) != "classificar":
            return True
        if not isinstance(obj, Tarefa):
            return True
        return _usuario_pode_classificar_tarefa(request.user, obj)


def _coluna_iniciada_do_quadro(quadro_id):
    return (
        ColunaTarefa.objects.filter(
            quadro_id=quadro_id,
            status_semantico__in=(
                StatusSemanticoColunaChoices.INICIADA,
                StatusSemanticoColunaChoices.EM_ANDAMENTO,
            ),
        )
        .order_by("ordem", "nome")
        .first()
    )


def _coluna_finalizada_do_quadro(quadro_id):
    return (
        ColunaTarefa.objects.filter(
            quadro_id=quadro_id,
            status_semantico__in=(
                StatusSemanticoColunaChoices.FINALIZADA,
                StatusSemanticoColunaChoices.CONCLUIDO,
            ),
        )
        .order_by("ordem", "nome")
        .first()
    )


class KanbanTarefasView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS

    def get(self, request):
        quadro_id = request.query_params.get("quadro")
        qs = quadro_kanban_queryset(
            usuario=request.user,
            somente_minhas=_somente_tarefas_do_usuario(request.user),
        )
        quadro = qs.filter(pk=quadro_id).first() if quadro_id else qs.first()
        return Response(
            {
                "quadro": QuadroKanbanSerializer(
                    quadro,
                    context={"request": request},
                ).data
                if quadro
                else None,
            }
        )


class QuadroPadraoTarefasView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_CRIAR

    def post(self, request):
        quadro = garantir_quadro_padrao_tarefas(usuario=request.user)
        quadro = quadro_kanban_queryset(usuario=request.user).filter(pk=quadro.pk).first()
        return Response(
            {
                "quadro": QuadroKanbanSerializer(
                    quadro,
                    context={"request": request},
                ).data
                if quadro
                else None,
            },
            status=201,
        )


class TarefaResponsavelOptionsView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS

    def get(self, request):
        user_model = get_user_model()
        usuarios = user_model.objects.filter(is_active=True).order_by("first_name", "last_name", "email")
        data = [
            {
                "id": usuario.id,
                "label": (
                    f"{usuario.first_name} {usuario.last_name}".strip()
                    or usuario.email
                ),
                "email": usuario.email,
                "tipo_usuario": usuario.tipo_usuario,
            }
            for usuario in usuarios
        ]
        return Response(data)


class TarefaTimerAtivoView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_APONTAR_HORAS

    def get(self, request):
        agora = timezone.now()
        sessao = (
            SessaoTrabalhoTarefa.objects.select_related("tarefa", "colaborador")
            .filter(colaborador=request.user, finalizado_em__isnull=True)
            .first()
        )
        if sessao:
            encerrar, final_em, motivo = deve_encerrar_sessao_por_jornada(sessao, agora)
            if encerrar and final_em and motivo:
                with transaction.atomic():
                    bloqueada = (
                        SessaoTrabalhoTarefa.objects.select_for_update()
                        .filter(pk=sessao.pk, finalizado_em__isnull=True)
                        .first()
                    )
                    if bloqueada:
                        apontamento = bloqueada.encerrar(
                            finalizado_em=final_em,
                            motivo=motivo,
                            observacoes="Contagem encerrada automaticamente conforme jornada de trabalho.",
                        )
                        registrar_historico_tarefa(
                            tarefa=bloqueada.tarefa,
                            usuario=request.user,
                            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
                            descricao=(
                                "Apontamento encerrado ao fim da jornada."
                                if motivo == MotivoEncerramentoSessaoChoices.FIM_JORNADA
                                else "Apontamento encerrado no inicio do intervalo."
                            ),
                            dados={
                                "horas": str(apontamento.horas),
                                "data": apontamento.data.isoformat(),
                                "sessao": str(bloqueada.id),
                                "motivo_encerramento": bloqueada.motivo_encerramento,
                            },
                        )

        sessao = (
            SessaoTrabalhoTarefa.objects.select_related("tarefa", "colaborador")
            .filter(colaborador=request.user, finalizado_em__isnull=True)
            .first()
        )

        pausa_em = previsao_fim_segmento_sessao(sessao, agora) if sessao else None
        pode_iniciar, msg_jornada = usuario_pode_iniciar_cronometro_agora(request.user, agora)

        return Response(
            {
                "sessao": (
                    SessaoTrabalhoTarefaSerializer(sessao).data
                    if sessao
                    else None
                ),
                "pausa_automatica_prevista_em": (
                    pausa_em.isoformat() if pausa_em else None
                ),
                "jornada_permite_iniciar_cronometro": pode_iniciar,
                "jornada_mensagem": msg_jornada,
            }
        )


class TarefaDashboardHorasDiaView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_APONTAR_HORAS

    def get(self, request):
        data_texto = request.query_params.get("data")
        data_ref = timezone.localdate()
        if data_texto:
            try:
                data_ref = date.fromisoformat(data_texto)
            except ValueError:
                return Response({"data": "Informe uma data valida no formato AAAA-MM-DD."}, status=400)

        # Agregar sem select_related: evita qualquer multiplicação em SUM por joins.
        qs_hoje = ApontamentoHora.objects.filter(
            colaborador_id=request.user.pk,
            data=data_ref,
        ).exclude(
            status_aprovacao__in=(
                StatusAprovacaoHoraChoices.REJEITADO,
                StatusAprovacaoHoraChoices.CANCELADO,
                StatusAprovacaoHoraChoices.REPROVADO,
            )
        )
        total_horas = qs_hoje.aggregate(total=Sum("horas"))["total"] or Decimal("0.00")
        apontamentos = (
            qs_hoje.select_related(
                "tarefa",
                "colaborador",
                "aprovado_por",
                "sessao_trabalho",
            )
            .order_by("-criado_em")
        )
        tarefas_ids = set(qs_hoje.values_list("tarefa_id", flat=True).distinct())
        return Response(
            {
                "data": data_ref.isoformat(),
                "colaborador": request.user.id,
                "colaborador_nome": (
                    f"{request.user.first_name} {request.user.last_name}".strip()
                    or request.user.email
                ),
                "total_horas": f"{total_horas:.2f}",
                "total_apontamentos": apontamentos.count(),
                "total_tarefas": len(tarefas_ids),
                "apontamentos": ApontamentoHoraSerializer(apontamentos, many=True).data,
            }
        )


class TarefaRelatorioHorasGestaoView(APIView):
    """Relatório consolidado de horas para gestores (colaboradores, tarefas, proposta ou OP)."""

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_VISUALIZAR_RELATORIOS

    def get(self, request):
        proposta = (request.query_params.get("proposta") or "").strip() or None
        ordem_op = (request.query_params.get("ordem_producao") or "").strip() or None
        colaborador_raw = (request.query_params.get("colaborador") or "").strip()
        colaborador_id = None
        if colaborador_raw:
            try:
                colaborador_id = int(colaborador_raw)
            except ValueError:
                return Response({"detail": "colaborador invalido. Use o id numerico do usuario."}, status=400)
        data_inicio_raw = request.query_params.get("data_inicio")
        data_fim_raw = request.query_params.get("data_fim")
        data_inicio = None
        data_fim = None
        if data_inicio_raw:
            try:
                data_inicio = date.fromisoformat(data_inicio_raw)
            except ValueError:
                return Response(
                    {"detail": "data_inicio invalida. Use AAAA-MM-DD."},
                    status=400,
                )
        if data_fim_raw:
            try:
                data_fim = date.fromisoformat(data_fim_raw)
            except ValueError:
                return Response(
                    {"detail": "data_fim invalida. Use AAAA-MM-DD."},
                    status=400,
                )
        try:
            payload = montar_relatorio_horas_gestao(
                data_inicio=data_inicio,
                data_fim=data_fim,
                proposta_ref=proposta,
                ordem_producao_ref=ordem_op,
                colaborador_id=colaborador_id,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class TarefaRelatorioHorasGestaoColaboradoresView(APIView):
    """Lista colaboradores com apontamentos válidos no período (para filtros do relatório de gestão)."""

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_VISUALIZAR_RELATORIOS

    def get(self, request):
        data_inicio_raw = request.query_params.get("data_inicio")
        data_fim_raw = request.query_params.get("data_fim")
        if not data_inicio_raw or not data_fim_raw:
            return Response(
                {"detail": "Informe data_inicio e data_fim (AAAA-MM-DD)."},
                status=400,
            )
        try:
            data_inicio = date.fromisoformat(data_inicio_raw)
            data_fim = date.fromisoformat(data_fim_raw)
        except ValueError:
            return Response({"detail": "Datas invalidas. Use AAAA-MM-DD."}, status=400)
        try:
            payload = listar_colaboradores_com_apontamentos_no_periodo(
                data_inicio=data_inicio,
                data_fim=data_fim,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(payload)


class TarefaTimerIniciarView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_INICIAR

    def post(self, request, tarefa_id):
        tarefa = Tarefa.objects.filter(pk=tarefa_id).first()
        if not tarefa:
            return Response({"detail": "Tarefa nao encontrada."}, status=404)
        if not _usuario_tem_acesso_tarefa(request.user, tarefa):
            return Response({"detail": "Tarefa nao encontrada."}, status=404)
        if tarefa.status == StatusTarefaChoices.CONCLUIDA:
            return Response(
                {"detail": "Tarefas entregues nao aceitam contagem de horas."},
                status=400,
            )
        if not tarefa.pode_iniciar:
            return Response(
                {
                    "detail": (
                        "Classifique a tarefa corretamente antes de iniciar. "
                        "PROPOSTA exige PROP, PRODUCAO exige OP e INTERNA nao usa vinculo."
                    )
                },
                status=400,
            )

        ok_jornada, msg_jornada = usuario_pode_iniciar_cronometro_agora(request.user)
        if not ok_jornada:
            return Response({"detail": msg_jornada}, status=400)

        sessao_ativa = (
            SessaoTrabalhoTarefa.objects.select_related("tarefa", "colaborador")
            .filter(colaborador=request.user, finalizado_em__isnull=True)
            .first()
        )
        if sessao_ativa:
            serializer = SessaoTrabalhoTarefaSerializer(sessao_ativa)
            if sessao_ativa.tarefa_id == tarefa.id:
                return Response({"sessao": serializer.data})
            return Response(
                {
                    "detail": "Finalize a tarefa em andamento antes de iniciar outra.",
                    "sessao": serializer.data,
                },
                status=status.HTTP_409_CONFLICT,
            )

        try:
            with transaction.atomic():
                if tarefa.status not in (
                    StatusTarefaChoices.INICIADA,
                    StatusTarefaChoices.EM_ANDAMENTO,
                ):
                    coluna_iniciada = _coluna_iniciada_do_quadro(tarefa.coluna.quadro_id)
                    if coluna_iniciada is None:
                        return Response(
                            {
                                "detail": (
                                    "Configure uma coluna iniciada no quadro antes de iniciar tarefas."
                                )
                            },
                            status=400,
                        )
                    tarefa = mover_tarefa(
                        tarefa=tarefa,
                        coluna_destino=coluna_iniciada,
                        usuario=request.user,
                    )
                sessao = SessaoTrabalhoTarefa.objects.create(
                    tarefa=tarefa,
                    colaborador=request.user,
                    etapa="Cronometro",
                )
        except IntegrityError:
            sessao = (
                SessaoTrabalhoTarefa.objects.select_related("tarefa", "colaborador")
                .filter(colaborador=request.user, finalizado_em__isnull=True)
                .first()
            )
            return Response(
                {
                    "detail": "Ja existe uma tarefa em andamento para este colaborador.",
                    "sessao": (
                        SessaoTrabalhoTarefaSerializer(sessao).data
                        if sessao
                        else None
                    ),
                },
                status=status.HTTP_409_CONFLICT,
            )

        registrar_historico_tarefa(
            tarefa=tarefa,
            usuario=request.user,
            tipo=TipoHistoricoTarefaChoices.INICIADA,
            descricao="Sessao de trabalho iniciada.",
            dados={"sessao": str(sessao.id), "iniciado_em": sessao.iniciado_em.isoformat()},
        )
        return Response(
            {"sessao": SessaoTrabalhoTarefaSerializer(sessao).data},
            status=status.HTTP_201_CREATED,
        )


class TarefaTimerPararView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_APONTAR_HORAS

    def post(self, request):
        with transaction.atomic():
            sessao = (
                SessaoTrabalhoTarefa.objects.select_for_update()
                .select_related("tarefa", "colaborador")
                .filter(colaborador=request.user, finalizado_em__isnull=True)
                .first()
            )
            if not sessao:
                return Response(
                    {"detail": "Nenhuma contagem de horas ativa encontrada."},
                    status=404,
                )

            finalizado_em = timezone.now()
            jornada_u = obter_jornada_do_usuario(request.user)
            if jornada_u and jornada_u.hora_inicio and jornada_u.hora_fim:
                cap = max_finalizado_em_valido_na_sessao(
                    sessao, jornada_u, finalizado_em
                )
                if finalizado_em > cap:
                    finalizado_em = cap

            apontamento = sessao.encerrar(
                finalizado_em=finalizado_em,
                motivo=MotivoEncerramentoSessaoChoices.MANUAL,
            )

        registrar_historico_tarefa(
            tarefa=sessao.tarefa,
            usuario=request.user,
            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
            descricao="Apontamento de horas registrado por cronometro.",
            dados={
                "horas": str(apontamento.horas),
                "data": apontamento.data.isoformat(),
                "sessao": str(sessao.id),
                "iniciado_em": sessao.iniciado_em.isoformat(),
                "finalizado_em": sessao.finalizado_em.isoformat(),
            },
        )

        return Response(
            {
                "sessao": SessaoTrabalhoTarefaSerializer(sessao).data,
                "apontamento": ApontamentoHoraSerializer(apontamento).data,
            }
        )


class QuadroTarefaViewSet(ModelViewSet):
    serializer_class = QuadroTarefaSerializer
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        return quadros_ativos_queryset().order_by("nome")

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS
        return PermissionKeys.TAREFA_GERENCIAR_QUADRO

    def perform_create(self, serializer):
        serializer.save(criado_por=self.request.user)


class ColunaTarefaViewSet(ModelViewSet):
    queryset = ColunaTarefa.objects.select_related("quadro").all()
    serializer_class = ColunaTarefaSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS
        return PermissionKeys.TAREFA_GERENCIAR_QUADRO


class TarefaViewSet(ModelViewSet):
    queryset = (
        Tarefa.objects.select_related(
            "coluna",
            "coluna__quadro",
            "responsavel",
            "criador",
        )
        .prefetch_related("colaboradores")
        .all()
    )
    serializer_class = TarefaSerializer
    permission_classes = [HasEffectivePermission, PodeClassificarTarefaObjeto]

    def get_queryset(self):
        qs = super().get_queryset()
        if _somente_tarefas_do_usuario(self.request.user):
            qs = qs.filter(tarefa_acessivel_usuario_q(self.request.user)).distinct()
        quadro = self.request.query_params.get("quadro")
        coluna = self.request.query_params.get("coluna")
        status = self.request.query_params.get("status")
        minhas = self.request.query_params.get("minhas")
        if quadro:
            qs = qs.filter(coluna__quadro_id=quadro)
        if coluna:
            qs = qs.filter(coluna_id=coluna)
        if status:
            qs = qs.filter(status=status)
        if minhas in ("1", "true", "True"):
            qs = qs.filter(responsavel=self.request.user)
        return tarefas_com_total_horas_queryset(qs, colaborador=self.request.user)

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve", "historico"):
            return PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS
        if self.action == "create":
            return PermissionKeys.TAREFA_CRIAR
        if self.action == "classificar":
            return PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS
        if self.action == "concluir":
            return PermissionKeys.TAREFA_CONCLUIR
        if self.action == "destroy":
            return PermissionKeys.TAREFA_EXCLUIR
        if self.action in ("update", "partial_update"):
            campos_classificacao = {
                "tipo_etapa",
                "proposta_referencia",
                "ordem_producao_referencia",
            }
            if campos_classificacao.intersection(set(request.data.keys())):
                return PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS
        return PermissionKeys.TAREFA_EDITAR

    def check_object_permissions(self, request, obj):
        if self.action in ("update", "partial_update"):
            keys = set(request.data.keys())
            campos_class = {
                "tipo_etapa",
                "proposta_referencia",
                "ordem_producao_referencia",
            }
            outros = keys - campos_class
            if keys & campos_class:
                if not _usuario_pode_classificar_tarefa(request.user, obj):
                    raise PermissionDenied(
                        "Sem permissao para alterar a classificacao desta tarefa."
                    )
            if outros:
                if not _usuario_tem_permissao(request.user, PermissionKeys.TAREFA_EDITAR):
                    raise PermissionDenied("Sem permissao para editar esta tarefa.")
        super().check_object_permissions(request, obj)

    def perform_create(self, serializer):
        tarefa = serializer.save(criador=self.request.user)
        if (
            _somente_tarefas_do_usuario(self.request.user)
            and tarefa.responsavel_id is None
            and not tarefa.colaboradores.exists()
        ):
            tarefa.colaboradores.add(self.request.user)
        registrar_historico_tarefa(
            tarefa=tarefa,
            usuario=self.request.user,
            tipo=TipoHistoricoTarefaChoices.CRIADA,
            descricao="Tarefa criada.",
            coluna_destino=tarefa.coluna,
        )

    def perform_update(self, serializer):
        anterior = self.get_object()
        coluna_anterior = anterior.coluna
        responsavel_anterior = anterior.responsavel
        prazo_anterior = anterior.prazo
        campos_editaveis = (
            "titulo",
            "descricao",
            "prioridade",
            "tipo_etapa",
            "proposta_referencia",
            "ordem_producao_referencia",
        )
        valores_anteriores = {
            campo: getattr(anterior, campo)
            for campo in campos_editaveis
        }
        tarefa = serializer.save()
        campos_alterados = [
            campo
            for campo, valor_anterior in valores_anteriores.items()
            if valor_anterior != getattr(tarefa, campo)
        ]
        if campos_alterados:
            registrar_historico_tarefa(
                tarefa=tarefa,
                usuario=self.request.user,
                tipo=TipoHistoricoTarefaChoices.EDITADA,
                descricao="Tarefa editada.",
                dados={"campos": campos_alterados},
            )
        if coluna_anterior_id := getattr(coluna_anterior, "id", None):
            if coluna_anterior_id != tarefa.coluna_id:
                registrar_historico_tarefa(
                    tarefa=tarefa,
                    usuario=self.request.user,
                    tipo=TipoHistoricoTarefaChoices.MOVIDA,
                    descricao=f"Tarefa movida para {tarefa.coluna.nome}.",
                    coluna_origem=coluna_anterior,
                    coluna_destino=tarefa.coluna,
                )
        if getattr(responsavel_anterior, "id", None) != getattr(tarefa.responsavel, "id", None):
            registrar_historico_tarefa(
                tarefa=tarefa,
                usuario=self.request.user,
                tipo=TipoHistoricoTarefaChoices.RESPONSAVEL,
                descricao="Responsavel da tarefa alterado.",
                responsavel_anterior=responsavel_anterior,
                responsavel_novo=tarefa.responsavel,
            )
        if prazo_anterior != tarefa.prazo:
            registrar_historico_tarefa(
                tarefa=tarefa,
                usuario=self.request.user,
                tipo=TipoHistoricoTarefaChoices.PRAZO,
                descricao="Prazo da tarefa alterado.",
                prazo_anterior=prazo_anterior,
                prazo_novo=tarefa.prazo,
            )

    @action(detail=True, methods=["post"], url_path="mover")
    def mover(self, request, pk=None):
        tarefa = self.get_object()
        serializer = MoverTarefaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            tarefa = mover_tarefa(
                tarefa=tarefa,
                coluna_destino=serializer.validated_data["coluna_id"],
                usuario=request.user,
                ordem=serializer.validated_data.get("ordem"),
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=400)
        return Response(self.get_serializer(tarefa).data)

    @action(detail=True, methods=["post"], url_path="classificar")
    def classificar(self, request, pk=None):
        tarefa = self.get_object()
        serializer = ClassificarTarefaSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        dados = serializer.validated_data
        campos = ("tipo_etapa", "proposta_referencia", "ordem_producao_referencia")
        alterou_classificacao = any(
            getattr(tarefa, campo) != dados.get(campo, "") for campo in campos
        )
        if (
            alterou_classificacao
            and tarefa.apontamentos.exists()
            and not _usuario_tem_permissao(
                request.user,
                PermissionKeys.TAREFA_ALTERAR_CLASSIFICACAO_COM_APONTAMENTOS,
            )
        ):
            raise PermissionDenied(
                "Nao altere a classificacao de tarefas que ja possuem apontamentos."
            )

        valores_anteriores = {campo: getattr(tarefa, campo) for campo in campos}
        if "horas_estipuladas" in dados:
            valores_anteriores["horas_estipuladas"] = tarefa.horas_estipuladas
        tarefa.tipo_etapa = dados["tipo_etapa"]
        tarefa.proposta_referencia = dados.get("proposta_referencia", "")
        tarefa.ordem_producao_referencia = dados.get("ordem_producao_referencia", "")
        if "horas_estipuladas" in dados:
            tarefa.horas_estipuladas = dados["horas_estipuladas"]
        update_fields = [
            "tipo_etapa",
            "proposta_referencia",
            "ordem_producao_referencia",
            "status",
            "concluida_em",
            "atualizado_em",
        ]
        if "horas_estipuladas" in dados:
            update_fields.insert(-2, "horas_estipuladas")
        try:
            tarefa.save(update_fields=update_fields)
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)

        depois = {campo: getattr(tarefa, campo) for campo in campos}
        if "horas_estipuladas" in dados:
            depois["horas_estipuladas"] = tarefa.horas_estipuladas
        registrar_historico_tarefa(
            tarefa=tarefa,
            usuario=request.user,
            tipo=TipoHistoricoTarefaChoices.CLASSIFICADA,
            descricao="Tarefa classificada.",
            dados={
                "antes": valores_anteriores,
                "depois": depois,
            },
        )
        return Response(self.get_serializer(tarefa).data)

    @action(detail=True, methods=["post"], url_path="concluir")
    def concluir(self, request, pk=None):
        tarefa = self.get_object()
        if (
            not _usuario_pode_visualizar_todas_tarefas(request.user)
            and tarefa.responsavel_id != request.user.id
        ):
            raise PermissionDenied("Apenas responsavel ou gestor pode concluir a tarefa.")
        coluna_finalizada = _coluna_finalizada_do_quadro(tarefa.coluna.quadro_id)
        if coluna_finalizada is None:
            return Response(
                {"detail": "Configure uma coluna finalizada no quadro antes de concluir tarefas."},
                status=400,
            )
        try:
            tarefa = mover_tarefa(
                tarefa=tarefa,
                coluna_destino=coluna_finalizada,
                usuario=request.user,
            )
        except DjangoValidationError as exc:
            return Response({"detail": str(exc)}, status=400)
        registrar_historico_tarefa(
            tarefa=tarefa,
            usuario=request.user,
            tipo=TipoHistoricoTarefaChoices.CONCLUIDA,
            descricao="Tarefa concluida.",
        )
        return Response(self.get_serializer(tarefa).data)

    @action(detail=True, methods=["get"], url_path="historico")
    def historico(self, request, pk=None):
        tarefa = self.get_object()
        historico = tarefa.historico.select_related(
            "usuario", "coluna_origem", "coluna_destino"
        )[:100]
        return Response(HistoricoTarefaSerializer(historico, many=True).data)


class ComentarioTarefaViewSet(ModelViewSet):
    queryset = ComentarioTarefa.objects.select_related("tarefa", "autor").all()
    serializer_class = ComentarioTarefaSerializer
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        qs = super().get_queryset().order_by("criado_em")
        tarefa_id = self.request.query_params.get("tarefa")
        if tarefa_id:
            qs = qs.filter(tarefa_id=tarefa_id)
        return qs

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS
        return PermissionKeys.TAREFA_EDITAR

    def perform_create(self, serializer):
        serializer.save(autor=self.request.user)


class ChecklistTarefaViewSet(ModelViewSet):
    queryset = ChecklistTarefa.objects.select_related("tarefa", "concluido_por").all()
    serializer_class = ChecklistTarefaSerializer
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        qs = super().get_queryset().order_by("ordem", "titulo")
        tarefa_id = self.request.query_params.get("tarefa")
        if tarefa_id:
            qs = qs.filter(tarefa_id=tarefa_id)
        return qs

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS
        return PermissionKeys.TAREFA_EDITAR

    def perform_update(self, serializer):
        concluido = serializer.validated_data.get("concluido")
        serializer.save(concluido_por=self.request.user if concluido else None)


class ApontamentoHoraViewSet(ModelViewSet):
    queryset = ApontamentoHora.objects.select_related(
        "tarefa",
        "colaborador",
        "aprovado_por",
        "sessao_trabalho",
    ).all()
    serializer_class = ApontamentoHoraSerializer
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        qs = super().get_queryset().order_by("-data", "-criado_em")
        if _somente_tarefas_do_usuario(self.request.user):
            qs = qs.filter(_apontamento_acessivel_usuario_q(self.request.user)).distinct()
        tarefa = self.request.query_params.get("tarefa")
        colaborador = self.request.query_params.get("colaborador")
        minhas = self.request.query_params.get("minhas")
        data_inicio = self.request.query_params.get("data_inicio")
        data_fim = self.request.query_params.get("data_fim")
        if tarefa:
            qs = qs.filter(tarefa_id=tarefa)
        if colaborador:
            qs = qs.filter(colaborador_id=colaborador)
        if minhas in ("1", "true", "True"):
            qs = qs.filter(colaborador=self.request.user)
        if data_inicio:
            qs = qs.filter(data__gte=data_inicio)
        if data_fim:
            qs = qs.filter(data__lte=data_fim)
        return qs

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS
        if self.action in ("aprovar", "rejeitar"):
            return PermissionKeys.TAREFA_APROVAR_HORAS
        if self.action == "ajustar":
            return PermissionKeys.TAREFA_AJUSTAR_HORAS
        return PermissionKeys.TAREFA_APONTAR_HORAS

    def perform_create(self, serializer):
        tarefa = serializer.validated_data["tarefa"]
        if not _usuario_tem_acesso_tarefa(self.request.user, tarefa):
            raise PermissionDenied("Voce nao pode apontar horas nesta tarefa.")
        if not tarefa.pode_receber_apontamento:
            raise PermissionDenied(
                "Aponte horas apenas em tarefas classificadas e iniciadas."
            )
        colaborador = serializer.validated_data.pop("colaborador", self.request.user)
        origem = OrigemApontamentoHoraChoices.COLABORADOR
        if colaborador != self.request.user:
            if not _usuario_tem_permissao(
                self.request.user,
                PermissionKeys.TAREFA_APONTAR_HORAS_TODAS,
            ):
                raise PermissionDenied("Voce so pode apontar suas proprias horas.")
            if not (serializer.validated_data.get("justificativa_ajuste") or "").strip():
                raise PermissionDenied(
                    "Informe uma justificativa para apontar horas de outro colaborador."
                )
            origem = OrigemApontamentoHoraChoices.GESTOR

        apontamento = serializer.save(colaborador=colaborador, origem=origem)
        registrar_historico_tarefa(
            tarefa=apontamento.tarefa,
            usuario=self.request.user,
            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
            descricao="Apontamento de horas registrado.",
            dados={
                "horas": str(apontamento.horas),
                "data": apontamento.data.isoformat(),
                "colaborador": apontamento.colaborador_id,
                "origem": apontamento.origem,
            },
        )

    @action(detail=True, methods=["post"], url_path="aprovar")
    def aprovar(self, request, pk=None):
        apontamento = self.get_object()
        apontamento.status_aprovacao = StatusAprovacaoHoraChoices.APROVADO
        apontamento.aprovado_por = request.user
        apontamento.save(
            update_fields=(
                "status_aprovacao",
                "aprovado_por",
                "aprovado_em",
                "atualizado_em",
            )
        )
        registrar_historico_tarefa(
            tarefa=apontamento.tarefa,
            usuario=request.user,
            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
            descricao="Apontamento de horas aprovado.",
            dados={"apontamento": str(apontamento.id)},
        )
        return Response(self.get_serializer(apontamento).data)

    @action(detail=True, methods=["post"], url_path="rejeitar")
    def rejeitar(self, request, pk=None):
        apontamento = self.get_object()
        apontamento.status_aprovacao = StatusAprovacaoHoraChoices.REJEITADO
        apontamento.save(
            update_fields=(
                "status_aprovacao",
                "aprovado_por",
                "aprovado_em",
                "atualizado_em",
            )
        )
        registrar_historico_tarefa(
            tarefa=apontamento.tarefa,
            usuario=request.user,
            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
            descricao="Apontamento de horas rejeitado.",
            dados={"apontamento": str(apontamento.id)},
        )
        return Response(self.get_serializer(apontamento).data)

    @action(detail=True, methods=["post"], url_path="ajustar")
    def ajustar(self, request, pk=None):
        apontamento = self.get_object()
        justificativa = (request.data.get("justificativa_ajuste") or "").strip()
        if not justificativa:
            return Response(
                {"justificativa_ajuste": "Informe a justificativa do ajuste."},
                status=400,
            )

        campos_permitidos = ("data", "horas", "hora_inicio", "hora_fim", "etapa", "observacoes")
        for campo in campos_permitidos:
            if campo in request.data:
                setattr(apontamento, campo, request.data[campo])
        apontamento.justificativa_ajuste = justificativa
        apontamento.origem = OrigemApontamentoHoraChoices.GESTOR
        apontamento.status_aprovacao = StatusAprovacaoHoraChoices.AJUSTADO
        try:
            apontamento.save()
        except DjangoValidationError as exc:
            return Response(exc.message_dict, status=400)
        registrar_historico_tarefa(
            tarefa=apontamento.tarefa,
            usuario=request.user,
            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
            descricao="Apontamento de horas ajustado.",
            dados={"apontamento": str(apontamento.id), "justificativa": justificativa},
        )
        return Response(self.get_serializer(apontamento).data)


class HistoricoTarefaViewSet(ReadOnlyModelViewSet):
    queryset = HistoricoTarefa.objects.select_related(
        "tarefa",
        "usuario",
        "coluna_origem",
        "coluna_destino",
        "responsavel_anterior",
        "responsavel_novo",
    ).all()
    serializer_class = HistoricoTarefaSerializer
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.TAREFA_VISUALIZAR_PROPRIAS

    def get_queryset(self):
        qs = super().get_queryset().order_by("-criado_em")
        tarefa_id = self.request.query_params.get("tarefa")
        if tarefa_id:
            qs = qs.filter(tarefa_id=tarefa_id)
        return qs[:200]
