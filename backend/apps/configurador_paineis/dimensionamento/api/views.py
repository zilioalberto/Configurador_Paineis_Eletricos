"""Endpoints REST: consulta, recálculo e PATCH de condutores por projeto."""

from django.core.exceptions import ValidationError as DjangoValidationError
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.configurador_paineis.dimensionamento.api.serializers import (
    DimensionamentoProjetoDetalheSerializer,
    EscolhasCondutoresInputSerializer,
    EscolhasDimensionamentoMecanicoInputSerializer,
    ResumoDimensionamentoSerializer,
)
from apps.configurador_paineis.dimensionamento.models import ResumoDimensionamento
from apps.configurador_paineis.dimensionamento.services import calcular_e_salvar_dimensionamento_basico
from apps.configurador_paineis.dimensionamento.services.circuitos.escolhas_usuario import aplicar_escolhas_condutores
from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
    aplicar_escolhas_dimensionamento_mecanico,
    calcular_dimensionamento_mecanico,
    calcular_e_salvar_dimensionamento_mecanico,
    obter_dimensionamento_mecanico_atualizado,
)
from core.permissions import PermissionKeys
from apps.configurador_paineis.projetos.models import ProjetoConfigurador
from apps.configurador_paineis.projetos.services.rastreabilidade import registrar_evento_projeto


class DimensionamentoPorProjetoView(APIView):
    """
    GET: retorna o resumo salvo (com circuitos e tabelas de condutores).
    Cria o resumo na primeira vez e, em todo GET, recalcula o dimensionamento básico e os circuitos
    de carga para ficar alinhado às cargas atuais do projeto (novas cargas ou alterações sem POST em
    recalcular obtêm linhas em ``DimensionamentoCircuitoCarga``).
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.PROJETO_VISUALIZAR

    def get(self, request, projeto_id):
        projeto = get_object_or_404(ProjetoConfigurador, pk=projeto_id)
        ResumoDimensionamento.objects.select_related("projeto").get_or_create(
            projeto=projeto
        )
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
        projeto = get_object_or_404(ProjetoConfigurador, pk=projeto_id)
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
        projeto = get_object_or_404(ProjetoConfigurador, pk=projeto_id)
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


def _permission_dimensionamento_mecanico(request, _view):
    if request.method in ("POST", "PUT", "PATCH"):
        return PermissionKeys.PROJETO_EDITAR
    return PermissionKeys.PROJETO_VISUALIZAR


class DimensionamentoMecanicoView(APIView):
    """
    GET: recalcula a partir da composição atual (preservando escolhas salvas) e retorna o detalhe.
    POST: recalcula a partir da composição aprovada e persiste no resumo.
    PATCH: salva painel escolhido, canaleta e quantidades verticais/horizontais.
    """

    permission_classes = [HasEffectivePermission]
    required_permission = _permission_dimensionamento_mecanico

    def get(self, request, projeto_id):
        projeto = get_object_or_404(ProjetoConfigurador, pk=projeto_id)
        return Response(obter_dimensionamento_mecanico_atualizado(projeto))

    def post(self, request, projeto_id):
        projeto = get_object_or_404(ProjetoConfigurador, pk=projeto_id)
        resumo, dados = calcular_e_salvar_dimensionamento_mecanico(projeto)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="dimensionamento",
            acao="dimensionamento_mecanico",
            descricao="Dimensionamento mecânico da placa recalculado.",
            detalhes={
                "largura_painel_mm": resumo.largura_painel_mm,
                "altura_painel_mm": resumo.altura_painel_mm,
                "profundidade_painel_mm": resumo.profundidade_painel_mm,
            },
        )
        return Response(dados, status=status.HTTP_200_OK)

    def patch(self, request, projeto_id):
        projeto = get_object_or_404(ProjetoConfigurador, pk=projeto_id)
        input_serializer = EscolhasDimensionamentoMecanicoInputSerializer(data=request.data)
        input_serializer.is_valid(raise_exception=True)
        data = input_serializer.validated_data
        kwargs: dict = {}
        if "painel_produto_id" in data:
            pid = data["painel_produto_id"]
            kwargs["painel_produto_id"] = str(pid) if pid else None
        if "canaleta_produto_id" in data:
            cid = data["canaleta_produto_id"]
            kwargs["canaleta_produto_id"] = str(cid) if cid else None
        if "canaletas_verticais" in data:
            kwargs["canaletas_verticais"] = data["canaletas_verticais"]
        if "faixas_horizontais" in data:
            kwargs["faixas_horizontais"] = data["faixas_horizontais"]
        if "taxa_ocupacao_max_percentual" in data:
            kwargs["taxa_ocupacao_max_percentual"] = data["taxa_ocupacao_max_percentual"]
        if "disposicao_componentes" in data:
            kwargs["disposicao_componentes"] = data["disposicao_componentes"]
        if "canaletas_horizontais_intermediarias_y_mm" in data:
            kwargs["canaletas_horizontais_intermediarias_y_mm"] = data[
                "canaletas_horizontais_intermediarias_y_mm"
            ]

        try:
            resumo, dados = aplicar_escolhas_dimensionamento_mecanico(projeto, **kwargs)
        except DjangoValidationError as exc:
            detail = getattr(exc, "message_dict", None) or list(exc.messages)
            return Response(detail, status=status.HTTP_400_BAD_REQUEST)
        except (TypeError, ValueError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=request.user,
            modulo="dimensionamento",
            acao="dimensionamento_mecanico_escolhas",
            descricao="Escolhas de painel e canaletas salvas no dimensionamento mecânico.",
            detalhes={
                "painel": (dados.get("painel_escolhido") or {}).get("produto_codigo"),
                "canaletas_verticais": dados.get("canaletas_verticais"),
                "faixas_horizontais": dados.get("faixas_horizontais"),
            },
        )
        return Response(dados, status=status.HTTP_200_OK)
