from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.api.permissions import HasEffectivePermission
from dimensionamento.api.serializers import (
    DimensionamentoProjetoDetalheSerializer,
    EscolhasCondutoresInputSerializer,
    ResumoDimensionamentoSerializer,
)
from dimensionamento.models import ResumoDimensionamento
from dimensionamento.services import calcular_e_salvar_dimensionamento_basico
from dimensionamento.services.circuitos.escolhas_usuario import aplicar_escolhas_condutores
from core.permissions import PermissionKeys
from projetos.models import Projeto
from projetos.services.rastreabilidade import registrar_evento_projeto


class DimensionamentoPorProjetoView(APIView):
    """
    GET: retorna o resumo salvo (com circuitos e tabelas de condutores); cria e calcula na primeira vez.
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_VISUALIZAR

    def get(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        resumo, created = ResumoDimensionamento.objects.select_related(
            "projeto"
        ).get_or_create(projeto=projeto)
        if created:
            calcular_e_salvar_dimensionamento_basico(projeto)
        resumo = ResumoDimensionamento.objects.select_related("projeto").get(
            projeto=projeto
        )
        return Response(DimensionamentoProjetoDetalheSerializer(resumo).data)


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
            DimensionamentoProjetoDetalheSerializer(resumo).data,
            status=status.HTTP_200_OK,
        )


class DimensionamentoCondutoresPatchView(APIView):
    """
    PATCH: escolhas de bitola (Iz mínimo) e/ou confirmação da revisão de condutores.
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_EDITAR

    def patch(self, request, projeto_id):
        projeto = get_object_or_404(Projeto, pk=projeto_id)
        input_serializer = EscolhasCondutoresInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data
        try:
            resumo = aplicar_escolhas_condutores(
                projeto,
                circuitos=data["circuitos"],
                alimentacao_geral=data["alimentacao_geral"],
                confirmar_revisao=data["confirmar_revisao"],
            )
        except DjangoValidationError as exc:
            detail = getattr(exc, "message_dict", None) or list(exc.messages)
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)
        return Response(
            DimensionamentoProjetoDetalheSerializer(resumo).data,
            status=status.HTTP_200_OK,
        )
