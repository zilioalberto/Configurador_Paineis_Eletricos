from apps.configurador_paineis.cargas.models import Carga
from apps.catalogo.models import Produto
from apps.configurador_paineis.composicao_painel.models import PendenciaItem, SugestaoItem
from django.db.models import Q
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet
from rest_framework.decorators import action

from apps.accounts.api.permissions import HasEffectivePermission
from core.choices import (
    StatusPendenciaChoices,
    StatusProjetoChoices,
    StatusSugestaoChoices,
    TipoUsuarioChoices,
)
from core.permissions import PermissionKeys
from apps.configurador_paineis.projetos.api.serializers import (
    ProjetoDashboardMiniSerializer,
    ProjetoConfiguradorEventoSerializer,
    ProjetoSerializer,
)
from apps.configurador_paineis.projetos.models import ProjetoConfigurador, ProjetoConfiguradorEvento
from apps.configurador_paineis.projetos.services.codigo_projeto import sugerir_proximo_codigo_projeto
from apps.configurador_paineis.projetos.services.rastreabilidade import registrar_evento_projeto
from apps.configurador_paineis.projetos.services.tensao_nominal_dependentes import (
    reiniciar_dependentes_apos_alteracao_tensao_nominal,
)


class DashboardResumoView(APIView):
    """GET: agregados para o painel inicial (KPIs + projetos recentes)."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_VISUALIZAR

    def get(self, request):
        projetos_qs = _visible_projetos_queryset(request.user, ProjetoConfigurador.objects.filter(ativo=True))
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
    POST: devolve sugestão de código para novo projeto.
    Sem corpo: MMnnn-AA sequencial. Com orcamento_id: CONF-MMnnn-AA alinhado à proposta.
    Não grava no banco até o utilizador salvar a configuração.
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_CRIAR

    def post(self, request):
        from apps.configurador_paineis.projetos.services.codigo_projeto import (
            sugerir_codigo_configurador_de_proposta,
            sugerir_proximo_codigo_projeto,
        )
        from apps.orcamentos.models import Orcamento

        orcamento_id = request.data.get("orcamento_id")
        if orcamento_id:
            orcamento = Orcamento.objects.filter(pk=orcamento_id).first()
            if not orcamento or not (orcamento.codigo_base or "").strip():
                return Response(
                    {"detail": "Proposta não encontrada ou sem código base."},
                    status=400,
                )
            try:
                ordem = int(request.data.get("ordem_painel", 0))
            except (TypeError, ValueError):
                ordem = 0
            codigo = sugerir_codigo_configurador_de_proposta(
                orcamento.codigo_base,
                ordem_painel=max(0, ordem),
            )
        else:
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

        user_model = get_user_model()
        if request.user.is_superuser or request.user.tipo_usuario in (
            TipoUsuarioChoices.ADMIN,
            TipoUsuarioChoices.ALMOXARIFADO,
        ):
            users = user_model.objects.filter(is_active=True).order_by("first_name", "email")
        else:
            users = user_model.objects.filter(pk=request.user.pk)

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
    queryset = ProjetoConfigurador.objects.all().order_by("-criado_em")
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
        tensao_antes = serializer.instance.tensao_nominal
        projeto = serializer.save(atualizado_por=self.request.user)
        tensao_alterada = tensao_antes != projeto.tensao_nominal
        if tensao_alterada:
            reiniciar_dependentes_apos_alteracao_tensao_nominal(
                projeto,
                tensao_nominal_anterior=tensao_antes,
            )
        registrar_evento_projeto(
            projeto=projeto,
            usuario=self.request.user,
            modulo="projeto",
            acao="editado",
            descricao=(
                "Projeto atualizado."
                + (
                    " Tensão nominal alterada: composição reiniciada e dimensionamento recalculado."
                    if tensao_alterada
                    else ""
                )
            ),
            detalhes={
                "codigo": projeto.codigo,
                "nome": projeto.nome,
                "tensao_nominal_alterada": tensao_alterada,
                **(
                    {
                        "tensao_nominal_anterior": tensao_antes,
                        "tensao_nominal_nova": projeto.tensao_nominal,
                        "composicao_reiniciada": True,
                    }
                    if tensao_alterada
                    else {}
                ),
            },
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
        eventos = ProjetoConfiguradorEvento.objects.filter(
            projeto_configurador=projeto
        ).select_related("usuario")
        data = ProjetoConfiguradorEventoSerializer(eventos[:200], many=True).data
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
