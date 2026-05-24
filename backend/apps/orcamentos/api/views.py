from django.shortcuts import get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from core.permissions import PermissionKeys
from apps.configurador_paineis.projetos.models import ProjetoConfigurador
from apps.orcamentos.api.action_serializers import (
    AdicionarPainelConfiguradorSerializer,
    NovaRevisaoOrcamentoSerializer,
    VincularProjetoConfiguradorSerializer,
)
from apps.orcamentos.api.serializers import (
    ConfiguracaoMargemClienteSerializer,
    OrcamentoConfiguradorPainelSerializer,
    OrcamentoSerializer,
)
from apps.orcamentos.models import Orcamento, OrcamentoConfiguradorPainel, ConfiguracaoMargemCliente
from apps.orcamentos.services.configurador_painel import (
    OrcamentoOperacaoError,
    adicionar_painel_configurador,
    iniciar_projeto_configurador,
    sincronizar_composicao_painel,
    vincular_projeto_configurador,
)
from apps.orcamentos.services.revisao_orcamento import criar_revisao_orcamento


def _orcamento_queryset():
    return (
        Orcamento.objects.select_related(
            "cliente",
            "contato_cliente",
            "criado_por",
            "atualizado_por",
            "orcamento_origem",
        )
        .prefetch_related(
            "itens",
            "configuradores_painel__projeto_configurador",
        )
        .all()
    )


class OrcamentoListCreateView(generics.ListCreateAPIView):
    queryset = _orcamento_queryset()
    serializer_class = OrcamentoSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_CRIAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class OrcamentoDetailView(generics.RetrieveUpdateAPIView):
    queryset = _orcamento_queryset()
    serializer_class = OrcamentoSerializer
    permission_classes = [HasEffectivePermission]
    lookup_field = "pk"

    def required_permission(self, request, view):
        if request.method in ("PUT", "PATCH"):
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class OrcamentoNovaRevisaoView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_CRIAR

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = NovaRevisaoOrcamentoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            novo = criar_revisao_orcamento(
                orcamento,
                tipo_revisao=ser.validated_data["tipo_revisao"],
                paineis_reconfigurar=ser.validated_data.get("paineis_reconfigurar"),
                titulo=ser.validated_data.get("titulo") or None,
                descricao=ser.validated_data.get("descricao"),
                usuario=request.user if request.user.is_authenticated else None,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoSerializer(novo, context={"request": request}).data
        return Response(data, status=status.HTTP_201_CREATED)


class OrcamentoConfiguradorPainelListCreateView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR

    def get(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        paineis = orcamento.configuradores_painel.order_by("ordem", "id")
        data = OrcamentoConfiguradorPainelSerializer(paineis, many=True).data
        return Response(data)

    def post(self, request, pk):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        ser = AdicionarPainelConfiguradorSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            vinculo = adicionar_painel_configurador(
                orcamento,
                descricao_painel=ser.validated_data["descricao_painel"],
                usuario=request.user if request.user.is_authenticated else None,
            )
        except OrcamentoOperacaoError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoConfiguradorPainelSerializer(vinculo).data
        return Response(data, status=status.HTTP_201_CREATED)


class OrcamentoIniciarConfiguradorView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk, vinculo_id):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        vinculo = get_object_or_404(
            OrcamentoConfiguradorPainel,
            pk=vinculo_id,
            orcamento=orcamento,
        )
        try:
            vinculo = iniciar_projeto_configurador(
                orcamento,
                vinculo,
                usuario=request.user if request.user.is_authenticated else None,
            )
        except OrcamentoOperacaoError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoConfiguradorPainelSerializer(vinculo).data
        return Response(data, status=status.HTTP_200_OK)


class OrcamentoVincularProjetoConfiguradorView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk, vinculo_id):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        vinculo = get_object_or_404(
            OrcamentoConfiguradorPainel,
            pk=vinculo_id,
            orcamento=orcamento,
        )
        ser = VincularProjetoConfiguradorSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        projeto = get_object_or_404(
            ProjetoConfigurador,
            pk=ser.validated_data["projeto_configurador_id"],
        )
        try:
            vinculo = vincular_projeto_configurador(
                orcamento,
                vinculo,
                projeto,
                usuario=request.user if request.user.is_authenticated else None,
            )
        except OrcamentoOperacaoError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        data = OrcamentoConfiguradorPainelSerializer(vinculo).data
        return Response(data, status=status.HTTP_200_OK)


class OrcamentoSincronizarComposicaoView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.ORCAMENTO_EDITAR

    def post(self, request, pk, vinculo_id):
        orcamento = get_object_or_404(_orcamento_queryset(), pk=pk)
        vinculo = get_object_or_404(
            OrcamentoConfiguradorPainel,
            pk=vinculo_id,
            orcamento=orcamento,
        )
        try:
            itens = sincronizar_composicao_painel(orcamento, vinculo)
        except OrcamentoOperacaoError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        orcamento.refresh_from_db()
        return Response(
            {
                "itens_sincronizados": len(itens),
                "orcamento": OrcamentoSerializer(
                    orcamento, context={"request": request}
                ).data,
            },
            status=status.HTTP_200_OK,
        )


class ConfiguracaoMargemClienteListCreateView(generics.ListCreateAPIView):
    queryset = ConfiguracaoMargemCliente.objects.select_related("cliente").all()
    serializer_class = ConfiguracaoMargemClienteSerializer
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method == "POST":
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR


class ConfiguracaoMargemClienteDetailView(generics.RetrieveUpdateAPIView):
    queryset = ConfiguracaoMargemCliente.objects.select_related("cliente").all()
    serializer_class = ConfiguracaoMargemClienteSerializer
    permission_classes = [HasEffectivePermission]
    lookup_field = "pk"

    def required_permission(self, request, view):
        if request.method in ("PUT", "PATCH"):
            return PermissionKeys.ORCAMENTO_EDITAR
        return PermissionKeys.ORCAMENTO_VISUALIZAR
