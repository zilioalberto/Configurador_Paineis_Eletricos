"""Views REST de NFS-es recebidas (ADN) e sincronização."""
import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.nfe_serializers import (
    ControleNsuNfseAdnSerializer,
    DocumentoNfseRecebidoDetailSerializer,
    DocumentoNfseRecebidoSerializer,
)
from apps.fiscal.api.nfe_views import DocumentoFiscalPagination
from apps.fiscal.models import ControleNsuNfseAdn, DocumentoNfseRecebido
from apps.fiscal.services.nfse_adn import executar_sincronizacao_nfse_adn, get_nfse_adn_config
from apps.fiscal.services.nfse_adn.status import montar_status_nfse_adn_sync
from apps.fiscal.utils import normalizar_cnpj
from core.permissions import PermissionKeys

logger = logging.getLogger(__name__)


class DocumentoNfseRecebidoViewSet(ReadOnlyModelViewSet):
    """Lista e detalha NFS-es de serviço recebidas (tomador = empresa)."""

    permission_classes = [HasEffectivePermission]
    queryset = DocumentoNfseRecebido.objects.prefetch_related("itens").order_by(
        "-data_emissao",
        "-criada_em",
    )
    pagination_class = DocumentoFiscalPagination
    lookup_field = "public_id"

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentoNfseRecebidoDetailSerializer
        return DocumentoNfseRecebidoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params
        cnpj_prest = (params.get("cnpj_prestador") or "").strip()
        if cnpj_prest:
            qs = qs.filter(cnpj_prestador=normalizar_cnpj(cnpj_prest))
        numero = (params.get("numero") or "").strip()
        if numero:
            qs = qs.filter(numero=numero)
        origem = (params.get("origem_importacao") or "").strip()
        if origem:
            qs = qs.filter(origem_importacao=origem)
        return qs


class ControleNsuNfseAdnView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get(self, request, cnpj_raw: str):
        cnpj = normalizar_cnpj(cnpj_raw)
        if len(cnpj) != 14:
            return Response({"detail": "CNPJ inválido."}, status=status.HTTP_400_BAD_REQUEST)
        controle, _ = ControleNsuNfseAdn.objects.get_or_create(
            cnpj=cnpj,
            defaults={"ultimo_nsu": "000000000000000"},
        )
        return Response(ControleNsuNfseAdnSerializer(controle).data)


class SincronizarNfseAdnView(APIView):
    """Consulta ADN (distribuição DFe) e importa NFS-es recebidas."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        adn_status = montar_status_nfse_adn_sync()
        if not adn_status.nfse_adn_sync_disponivel:
            return Response(
                {"detail": adn_status.nfse_adn_sync_mensagem},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        config = get_nfse_adn_config()
        try:
            config.validate()
        except (ValueError, FileNotFoundError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if len(config.cnpj) != 14:
            return Response(
                {"detail": "Configure FISCAL_EMPRESA_CNPJ no servidor (14 dígitos)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            resultado = executar_sincronizacao_nfse_adn(config=config)
        except Exception:
            logger.exception("Falha inesperada na sincronização ADN")
            return Response(
                {"detail": "Erro interno ao sincronizar com o ADN NFS-e."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        payload = {
            "sucesso": resultado.sucesso,
            "mensagem": resultado.mensagem,
            "ciclos_executados": resultado.ciclos_executados,
            "documentos_importados": resultado.documentos_importados,
            "documentos_novos": resultado.documentos_novos,
            "documentos_duplicados": resultado.documentos_duplicados,
            "erros_importacao": resultado.erros_importacao,
            "alertas": resultado.alertas,
            "ultimo_status": resultado.ultimo_status,
            "ultimo_motivo": resultado.ultimo_motivo,
            "ultimo_nsu": resultado.ultimo_nsu,
            "max_nsu": resultado.max_nsu,
        }
        if not resultado.sucesso:
            partes = [resultado.mensagem]
            if resultado.ultimo_status:
                partes.append(f"({resultado.ultimo_status})")
            if resultado.ultimo_motivo:
                partes.append(resultado.ultimo_motivo)
            payload["detail"] = " ".join(p for p in partes if p).strip()

        status_code = (
            status.HTTP_200_OK if resultado.sucesso else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        return Response(payload, status=status_code)
