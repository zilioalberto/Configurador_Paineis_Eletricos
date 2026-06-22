"""API de manifestação do destinatário (portal JWT)."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.nfe_serializers import (
    DocumentoFiscalRecebidoDetailSerializer,
    DocumentoSefazDistribuidoDetailSerializer,
    SolicitarManifestacaoSerializer,
)
from apps.fiscal.models import DocumentoFiscalRecebido, DocumentoSefazDistribuido
from apps.fiscal.services.manifestacao_destinatario_service import (
    ManifestacaoDestinatarioError,
    solicitar_manifestacao_destinatario,
)
from apps.fiscal.services.sefaz.manifestacao_worker import processar_manifestacao_documento
from core.permissions import PermissionKeys


class SolicitarManifestacaoView(APIView):
    """Portal: enfileira manifestação para o job de sincronização SEFAZ processar."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

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
                "message": "Manifestação enfileirada. O job fiscal_sync_nsu enviará o evento à SEFAZ.",
                "documento": DocumentoFiscalRecebidoDetailSerializer(documento).data,
            },
            status=status.HTTP_202_ACCEPTED,
        )


class SolicitarManifestacaoDocumentoSefazView(APIView):
    """Portal: solicita e envia manifestação para um resumo da caixa de entrada SEFAZ."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request, documento_id: int):
        try:
            documento = DocumentoSefazDistribuido.objects.get(pk=documento_id)
        except DocumentoSefazDistribuido.DoesNotExist:
            return Response(
                {"detail": "Documento distribuído SEFAZ não encontrado."},
                status=status.HTTP_404_NOT_FOUND,
            )

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

        processamento = processar_manifestacao_documento(documento)
        documento.refresh_from_db()
        if processamento.sucesso:
            message = (
                "Manifestação registrada na SEFAZ. Consulte a SEFAZ novamente em alguns "
                "minutos para tentar obter o XML completo."
            )
            http_status = status.HTTP_200_OK
        elif processamento.erros:
            detalhe = "; ".join(processamento.detalhes) or "Não foi possível enviar a manifestação."
            message = f"Manifestação solicitada, mas a SEFAZ retornou erro: {detalhe}"
            http_status = status.HTTP_202_ACCEPTED
        else:
            message = "Manifestação enfileirada. A próxima sincronização enviará o evento à SEFAZ."
            http_status = status.HTTP_202_ACCEPTED
        return Response(
            {
                "message": message,
                "documento": DocumentoSefazDistribuidoDetailSerializer(documento).data,
            },
            status=http_status,
        )
