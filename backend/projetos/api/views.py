from cargas.models import Carga
from catalogo.models import Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from accounts.api.permissions import HasEffectivePermission
from core.choices import (
    StatusPendenciaChoices,
    StatusProjetoChoices,
    StatusSugestaoChoices,
)
from core.permissions import PermissionKeys
from projetos.api.serializers import ProjetoDashboardMiniSerializer, ProjetoSerializer
from projetos.models import Projeto
from projetos.services.codigo_projeto import sugerir_proximo_codigo_projeto


class DashboardResumoView(APIView):
    """GET: agregados para o painel inicial (KPIs + projetos recentes)."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_VISUALIZAR

    def get(self, request):
        projetos_qs = Projeto.objects.filter(ativo=True)
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
                    status=StatusPendenciaChoices.ABERTA,
                ).count(),
                "sugestoes_pendentes": SugestaoItem.objects.filter(
                    status=StatusSugestaoChoices.PENDENTE,
                ).count(),
            },
            "catalogo": {
                "produtos_ativos": Produto.objects.filter(ativo=True).count(),
            },
            "cargas": {
                "total": Carga.objects.filter(ativo=True).count(),
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


class ProjetoViewSet(ModelViewSet):
    queryset = Projeto.objects.all().order_by("-criado_em")
    serializer_class = ProjetoSerializer
    permission_classes = [HasEffectivePermission]

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