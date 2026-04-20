from cargas.models import Carga
from catalogo.models import Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action

from accounts.api.permissions import HasEffectivePermission
from core.choices import (
    StatusPendenciaChoices,
    StatusProjetoChoices,
    StatusSugestaoChoices,
    TipoUsuarioChoices,
)
from core.permissions import PermissionKeys
from projetos.api.serializers import (
    ProjetoDashboardMiniSerializer,
    ProjetoEventoSerializer,
    ProjetoSerializer,
)
from projetos.models import Projeto, ProjetoEvento
from projetos.services.codigo_projeto import sugerir_proximo_codigo_projeto
from projetos.services.rastreabilidade import registrar_evento_projeto


class DashboardResumoView(APIView):
    """GET: agregados para o painel inicial (KPIs + projetos recentes)."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_VISUALIZAR

    def get(self, request):
        projetos_qs = _visible_projetos_queryset(request.user, Projeto.objects.filter(ativo=True))
        recentes = projetos_qs.order_by("-atualizado_em", "-criado_em")[:10]

        data = {
            "projetos": {
                "total": projetos_qs.count(),
                "em_andamento": projetos_qs.filter(
                    status=StatusProjetoChoices.EM_ANDAMENTO
                ).count(),
                "finalizados": projetos_qs.filter(
                    status=StatusProjetoChoices.FINALIZADO
                ).count(),
            },
            "composicao": {
                "pendencias_abertas": PendenciaItem.objects.filter(
                    projeto__in=projetos_qs,
                    status=StatusPendenciaChoices.ABERTA,
                ).count(),
                "sugestoes_pendentes": SugestaoItem.objects.filter(
                    projeto__in=projetos_qs,
                    status=StatusSugestaoChoices.PENDENTE,
                ).count(),
            },
            "catalogo": {
                "produtos_ativos": Produto.objects.filter(ativo=True).count(),
            },
            "cargas": {
                "total": Carga.objects.filter(ativo=True, projeto__in=projetos_qs).count(),
            },
            "projetos_recentes": ProjetoDashboardMiniSerializer(
                recentes,
                many=True,
            ).data,
        }
        return Response(data)


class ProjetoAlocarCodigoView(APIView):
    """
    POST: devolve sugestão do próximo código (MMnnn-AA) para a tela de novo projeto.
    Não grava nada: o sequencial só avança quando um projeto é salvo com esse código.
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_CRIAR

    def post(self, request):
        codigo = sugerir_proximo_codigo_projeto()
        return Response({"codigo": codigo})


class ProjetoResponsavelOptionsView(APIView):
    """
    GET: lista utilizadores disponíveis para atribuição como responsável.
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_VISUALIZAR

    def get(self, request):
        from django.contrib.auth import get_user_model

        User = get_user_model()
        if request.user.is_superuser or request.user.tipo_usuario in (
            TipoUsuarioChoices.ADMIN,
            TipoUsuarioChoices.ALMOXARIFADO,
        ):
            users = User.objects.filter(is_active=True).order_by("first_name", "email")
        else:
            users = User.objects.filter(pk=request.user.pk)

        data = [
            {
                "id": user.id,
                "label": (f"{user.first_name} {user.last_name}").strip() or user.email,
                "email": user.email,
                "tipo_usuario": user.tipo_usuario,
            }
            for user in users
        ]
        return Response(data)


class ProjetoViewSet(ModelViewSet):
    queryset = Projeto.objects.all().order_by("-criado_em")
    serializer_class = ProjetoSerializer
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        return _visible_projetos_queryset(self.request.user, super().get_queryset())

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.PROJETO_VISUALIZAR
        if self.action == "create":
            return PermissionKeys.PROJETO_CRIAR
        if self.action in ("update", "partial_update"):
            return PermissionKeys.PROJETO_EDITAR
        if self.action == "destroy":
            return PermissionKeys.PROJETO_EXCLUIR
        return None

    def perform_create(self, serializer):
        projeto = serializer.save(
            criado_por=self.request.user,
            atualizado_por=self.request.user,
            responsavel=serializer.validated_data.get("responsavel") or self.request.user,
        )
        registrar_evento_projeto(
            projeto=projeto,
            usuario=self.request.user,
            modulo="projeto",
            acao="criado",
            descricao="Projeto criado.",
            detalhes={"codigo": projeto.codigo, "nome": projeto.nome},
        )

    def perform_update(self, serializer):
        projeto = serializer.save(atualizado_por=self.request.user)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=self.request.user,
            modulo="projeto",
            acao="editado",
            descricao="Projeto atualizado.",
            detalhes={"codigo": projeto.codigo, "nome": projeto.nome},
        )

    def perform_destroy(self, instance):
        registrar_evento_projeto(
            projeto=instance,
            usuario=self.request.user,
            modulo="projeto",
            acao="excluido",
            descricao="Projeto excluído.",
            detalhes={"codigo": instance.codigo, "nome": instance.nome},
        )
        super().perform_destroy(instance)

    @action(detail=True, methods=["get"], url_path="historico")
    def historico(self, request, pk=None):
        projeto = self.get_object()
        eventos = ProjetoEvento.objects.filter(projeto=projeto).select_related("usuario")
        data = ProjetoEventoSerializer(eventos[:200], many=True).data
        return Response(data)


def _visible_projetos_queryset(user, qs):
    if not getattr(user, "is_authenticated", False):
        return qs.none()

    if user.is_superuser:
        return qs

    if user.tipo_usuario in (TipoUsuarioChoices.ADMIN, TipoUsuarioChoices.ALMOXARIFADO):
        return qs

    if user.tipo_usuario == TipoUsuarioChoices.ORCAMENTISTA:
        return qs.filter(Q(criado_por=user) | Q(responsavel=user))

    return qs.filter(Q(criado_por=user) | Q(responsavel=user))