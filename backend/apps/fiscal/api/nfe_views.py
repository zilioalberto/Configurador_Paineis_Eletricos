"""Views REST de NF-es recebidas e controle NSU."""
from rest_framework import status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.nfe_serializers import (
    ControleNSUSerializer,
    ControleNSUUpdateSerializer,
    DocumentoFiscalRecebidoDetailSerializer,
    DocumentoFiscalRecebidoSerializer,
    ImportarXMLNFeSerializer,
)
from apps.fiscal.authentication import (
    ControleNSUGetPermission,
    FiscalAgentAuthentication,
    FiscalAgentTokenConfigured,
    IsFiscalAgentAuthenticated,
)
from apps.fiscal.models import ControleNSU, DocumentoFiscalRecebido
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.services.nfe_parser import NFeParserError
from apps.fiscal.utils import normalizar_cnpj
from core.permissions import PermissionKeys


def _resposta_importar_xml(resultado: dict) -> Response:
    documento = resultado["documento"]
    status_code = status.HTTP_201_CREATED if resultado["created"] else status.HTTP_200_OK
    return Response(
        {
            "created": resultado["created"],
            "message": resultado["message"],
            "documento_id": documento.id,
            "chave_acesso": documento.chave_acesso,
        },
        status=status_code,
    )


class DocumentoFiscalPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


class DocumentoFiscalRecebidoViewSet(ReadOnlyModelViewSet):
    """Lista e detalha NF-es recebidas (autenticação JWT padrão do projeto)."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_VISUALIZAR_LISTA

    queryset = DocumentoFiscalRecebido.objects.prefetch_related("itens").order_by(
        "-data_emissao",
        "-criada_em",
    )
    pagination_class = DocumentoFiscalPagination

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentoFiscalRecebidoDetailSerializer
        return DocumentoFiscalRecebidoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        chave = (params.get("chave_acesso") or "").strip()
        if chave:
            qs = qs.filter(chave_acesso=chave)

        cnpj_emit = (params.get("cnpj_emitente") or "").strip()
        if cnpj_emit:
            qs = qs.filter(cnpj_emitente=normalizar_cnpj(cnpj_emit))

        cnpj_dest = (params.get("cnpj_destinatario") or "").strip()
        if cnpj_dest:
            qs = qs.filter(cnpj_destinatario=normalizar_cnpj(cnpj_dest))

        numero = (params.get("numero") or "").strip()
        if numero:
            qs = qs.filter(numero=numero)

        serie = (params.get("serie") or "").strip()
        if serie:
            qs = qs.filter(serie=serie)

        status_imp = (params.get("status_importacao") or "").strip()
        if status_imp:
            qs = qs.filter(status_importacao=status_imp)

        origem = (params.get("origem_importacao") or "").strip()
        if origem:
            qs = qs.filter(origem_importacao=origem)

        manifestacao = (params.get("manifestacao_status") or "").strip()
        if manifestacao:
            qs = qs.filter(manifestacao_status=manifestacao)

        return qs


class ImportarXMLNFeView(APIView):
    """Importa XML de NF-e (agente fiscal / ponte A3)."""

    authentication_classes = [FiscalAgentAuthentication]
    permission_classes = [FiscalAgentTokenConfigured, IsFiscalAgentAuthenticated]

    def post(self, request):
        serializer = ImportarXMLNFeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            resultado = importar_xml_nfe(
                xml=data["xml"],
                nsu=data.get("nsu") or None,
                cnpj_destinatario=data.get("cnpj_destinatario") or None,
                origem_importacao=data.get("origem_importacao"),
            )
        except NFeParserError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return _resposta_importar_xml(resultado)


class ImportarXMLNFePortalView(APIView):
    """Importa XML de NF-e pelo portal (JWT); origem fixa MANUAL."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_EDITAR_LISTA

    def post(self, request):
        serializer = ImportarXMLNFeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            resultado = importar_xml_nfe(
                xml=data["xml"],
                nsu=data.get("nsu") or None,
                cnpj_destinatario=data.get("cnpj_destinatario") or None,
                origem_importacao="MANUAL",
            )
        except NFeParserError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return _resposta_importar_xml(resultado)


class ControleNSUBaseView(APIView):
    authentication_classes = [FiscalAgentAuthentication]
    permission_classes = [FiscalAgentTokenConfigured, IsFiscalAgentAuthenticated]

    def _get_or_create(self, cnpj_raw: str) -> ControleNSU:
        cnpj = normalizar_cnpj(cnpj_raw)
        if len(cnpj) != 14:
            from rest_framework.exceptions import ValidationError

            raise ValidationError({"cnpj": "CNPJ deve conter 14 dígitos."})
        controle, _ = ControleNSU.objects.get_or_create(
            cnpj=cnpj,
            defaults={"ultimo_nsu": "000000000000000"},
        )
        return controle


class ControleNSUView(ControleNSUBaseView):
    def get_authenticators(self):
        if self.request.method == "GET":
            return [FiscalAgentAuthentication(), JWTAuthentication()]
        return [FiscalAgentAuthentication()]

    def get_permissions(self):
        if self.request.method == "GET":
            return [ControleNSUGetPermission()]
        return [FiscalAgentTokenConfigured(), IsFiscalAgentAuthenticated()]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_VISUALIZAR_LISTA

    def get(self, request, cnpj: str):
        controle = self._get_or_create(cnpj)
        return Response(ControleNSUSerializer(controle).data)

    def patch(self, request, cnpj: str):
        controle = self._get_or_create(cnpj)
        serializer = ControleNSUUpdateSerializer(
            controle,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(ControleNSUSerializer(controle).data)
