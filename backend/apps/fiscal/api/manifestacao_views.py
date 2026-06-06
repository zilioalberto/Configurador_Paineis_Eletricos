"""API de manifestação do destinatário (portal JWT + agente Bearer)."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.nfe_serializers import (
    DocumentoFiscalRecebidoDetailSerializer,
    ManifestacaoPendenteSerializer,
    RegistrarManifestacaoResultadoSerializer,
    SolicitarManifestacaoSerializer,
)
from apps.fiscal.authentication import (
    FiscalAgentAuthentication,
    FiscalAgentTokenConfigured,
    IsFiscalAgentAuthenticated,
)
from apps.fiscal.choices import StatusManifestacaoDestinatarioChoices
from apps.fiscal.models import DocumentoFiscalRecebido
from apps.fiscal.services.manifestacao_destinatario_service import (
    ManifestacaoDestinatarioError,
    registrar_resultado_manifestacao,
    solicitar_manifestacao_destinatario,
)
from core.permissions import PermissionKeys


class SolicitarManifestacaoView(APIView):
    """Portal: enfileira manifestação para a ponte A3 processar na SEFAZ."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_EDITAR_LISTA

    def post(self, request, documento_id: int):
        try:
            documento = DocumentoFiscalRecebido.objects.get(pk=documento_id)
        except DocumentoFiscalRecebido.DoesNotExist:
            return Response({"detail": "NF-e não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        serializer = SolicitarManifestacaoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            solicitar_manifestacao_destinatario(
                documento,
                tipo=data["tipo"],
                justificativa=data.get("justificativa") or "",
            )
        except ManifestacaoDestinatarioError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        documento.refresh_from_db()
        return Response(
            {
                "message": "Manifestação enfileirada. A ponte A3 enviará o evento à SEFAZ.",
                "documento": DocumentoFiscalRecebidoDetailSerializer(documento).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class ManifestacoesPendentesAgentView(APIView):
    """Agente: lista NF-es com manifestação pendente."""

    authentication_classes = [FiscalAgentAuthentication]
    permission_classes = [FiscalAgentTokenConfigured, IsFiscalAgentAuthenticated]

    def get(self, request):
        limit = min(int(request.query_params.get("limit", 50)), 200)
        qs = (
            DocumentoFiscalRecebido.objects.filter(
                manifestacao_status=StatusManifestacaoDestinatarioChoices.PENDENTE,
            )
            .order_by("manifestacao_solicitada_em", "id")[:limit]
        )
        return Response(ManifestacaoPendenteSerializer(qs, many=True).data)


class RegistrarManifestacaoAgentView(APIView):
    """Agente: registra resultado da manifestação na SEFAZ."""

    authentication_classes = [FiscalAgentAuthentication]
    permission_classes = [FiscalAgentTokenConfigured, IsFiscalAgentAuthenticated]

    def post(self, request, documento_id: int):
        try:
            documento = DocumentoFiscalRecebido.objects.get(pk=documento_id)
        except DocumentoFiscalRecebido.DoesNotExist:
            return Response({"detail": "NF-e não encontrada."}, status=status.HTTP_404_NOT_FOUND)

        serializer = RegistrarManifestacaoResultadoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            registrar_resultado_manifestacao(
                documento,
                sucesso=data["sucesso"],
                protocolo=data.get("protocolo") or "",
                cstat=data.get("cstat") or "",
                motivo=data.get("motivo") or "",
                mensagem_erro=data.get("mensagem_erro") or "",
            )
        except ManifestacaoDestinatarioError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        documento.refresh_from_db()
        return Response(
            {
                "message": "Resultado registrado.",
                "documento_id": documento.id,
                "manifestacao_status": documento.manifestacao_status,
            }
        )
