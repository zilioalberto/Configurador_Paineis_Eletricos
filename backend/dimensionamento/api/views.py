from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from dimensionamento.api.serializers import ResumoDimensionamentoSerializer
from dimensionamento.models import ResumoDimensionamento
from dimensionamento.services import calcular_e_salvar_dimensionamento_basico
from projetos.models import Projeto


class DimensionamentoPorProjetoView(APIView):
    """
    GET: retorna o resumo salvo; cria o registro e calcula na primeira vez.
    """

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

    def post(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        resumo = calcular_e_salvar_dimensionamento_basico(projeto)
        resumo = ResumoDimensionamento.objects.select_related("projeto").get(pk=resumo.pk)
        return Response(
            ResumoDimensionamentoSerializer(resumo).data,
            status=status.HTTP_200_OK,
        )
