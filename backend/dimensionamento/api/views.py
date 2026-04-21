from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.api.permissions import HasEffectivePermission
from dimensionamento.api.serializers import ResumoDimensionamentoSerializer
from dimensionamento.models import ResumoDimensionamento
from dimensionamento.services import calcular_e_salvar_dimensionamento_basico
from core.permissions import PermissionKeys
from projetos.models import Projeto
from projetos.services.rastreabilidade import registrar_evento_projeto


class DimensionamentoPorProjetoView(APIView):
    """
    GET: retorna o resumo salvo; cria o registro e calcula na primeira vez.
    """
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_VISUALIZAR

    def get(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        resumo, created = ResumoDimensionamento.objects.select_related(
            "projeto"
        ).get_or_create(projeto=projeto)
        if created:
            resumo = calcular_e_salvar_dimensionamento_basico(projeto)
        return Response(ResumoDimensionamentoSerializer(resumo).data)


class DimensionamentoRecalcularView(APIView):
    """POST: recalcula e persiste o dimensionamento básico do projeto."""
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_EDITAR

    def post(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        resumo = calcular_e_salvar_dimensionamento_basico(projeto)
        resumo = ResumoDimensionamento.objects.select_related("projeto").get(pk=resumo.pk)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="dimensionamento",
            acao="recalculado",
            descricao="Dimensionamento recalculado.",
            detalhes={"corrente_total_painel_a": str(resumo.corrente_total_painel_a)},
        )
        return Response(
            ResumoDimensionamentoSerializer(resumo).data,
            status=status.HTTP_200_OK,
        )
