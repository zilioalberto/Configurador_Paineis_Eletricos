"""Views REST de NF-es recebidas e controle NSU."""
from decimal import Decimal

from rest_framework import status
from rest_framework.exceptions import ValidationError
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework_simplejwt.authentication import JWTAuthentication

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.nfe_serializers import (
    ControleNSUSerializer,
    ControleNSUUpdateSerializer,
    DocumentoFiscalEmitidoDetailSerializer,
    DocumentoFiscalEmitidoSerializer,
    DocumentoFiscalRecebidoDetailSerializer,
    DocumentoFiscalRecebidoSerializer,
    ImportarXMLDocumentoEmitidoSerializer,
    ImportarXMLNFeSerializer,
    RelatorioNFeSerializer,
)
from apps.fiscal.authentication import (
    ControleNSUGetPermission,
    FiscalAgentAuthentication,
    FiscalAgentTokenConfigured,
    IsFiscalAgentAuthenticated,
)
from apps.fiscal.models import ControleNSU, DocumentoFiscalEmitido, DocumentoFiscalRecebido
from apps.fiscal.services.documento_emitido_parser import DocumentoEmitidoParserError
from apps.fiscal.services.importar_xml_documento_emitido_service import (
    importar_xml_documento_emitido,
)
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

        objetivo = (params.get("objetivo_entrada") or "").strip()
        if objetivo:
            qs = qs.filter(objetivo_entrada=objetivo)

        manifestacao = (params.get("manifestacao_status") or "").strip()
        if manifestacao:
            qs = qs.filter(manifestacao_status=manifestacao)

        return qs


class DocumentoFiscalEmitidoViewSet(ReadOnlyModelViewSet):
    """Lista e detalha NF-es/NFS-es emitidas pela ZFW."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_VISUALIZAR_LISTA

    queryset = DocumentoFiscalEmitido.objects.prefetch_related("itens").order_by(
        "-data_emissao",
        "-criada_em",
    )
    pagination_class = DocumentoFiscalPagination

    def get_serializer_class(self):
        if self.action == "retrieve":
            return DocumentoFiscalEmitidoDetailSerializer
        return DocumentoFiscalEmitidoSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        params = self.request.query_params

        tipo = (params.get("tipo_documento") or "").strip()
        if tipo:
            qs = qs.filter(tipo_documento=tipo)

        objetivo = (params.get("objetivo_saida") or "").strip()
        if objetivo:
            qs = qs.filter(objetivo_saida=objetivo)

        cnpj_dest = (params.get("cnpj_destinatario") or "").strip()
        if cnpj_dest:
            qs = qs.filter(cnpj_destinatario=normalizar_cnpj(cnpj_dest))

        cliente = (params.get("cliente") or "").strip()
        if cliente:
            qs = qs.filter(nome_destinatario__icontains=cliente)

        return qs


class RelatorioNFeView(APIView):
    """Relatório gerencial/contábil de NF-es por período e finalidade."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_VISUALIZAR_LISTA

    def _queryset_entradas(self, params):
        qs = DocumentoFiscalRecebido.objects.prefetch_related("itens").order_by(
            "-data_emissao",
            "-criada_em",
        )

        data_inicio = (params.get("data_inicio") or "").strip()
        if data_inicio:
            qs = qs.filter(data_emissao__date__gte=data_inicio)

        data_fim = (params.get("data_fim") or "").strip()
        if data_fim:
            qs = qs.filter(data_emissao__date__lte=data_fim)

        objetivo = (params.get("objetivo_entrada") or "").strip()
        if objetivo:
            qs = qs.filter(objetivo_entrada=objetivo)

        cnpj_emit = (params.get("cnpj_emitente") or "").strip()
        if cnpj_emit:
            qs = qs.filter(cnpj_emitente=normalizar_cnpj(cnpj_emit))

        fornecedor = (params.get("fornecedor") or "").strip()
        if fornecedor:
            qs = qs.filter(nome_emitente__icontains=fornecedor)

        return qs

    def _queryset_saidas(self, params):
        qs = DocumentoFiscalEmitido.objects.prefetch_related("itens").order_by(
            "-data_emissao",
            "-criada_em",
        )

        data_inicio = (params.get("data_inicio") or "").strip()
        if data_inicio:
            qs = qs.filter(data_emissao__date__gte=data_inicio)

        data_fim = (params.get("data_fim") or "").strip()
        if data_fim:
            qs = qs.filter(data_emissao__date__lte=data_fim)

        objetivo = (params.get("objetivo_saida") or params.get("objetivo_entrada") or "").strip()
        if objetivo:
            qs = qs.filter(objetivo_saida=objetivo)

        cnpj_dest = (params.get("cnpj_destinatario") or params.get("cnpj_emitente") or "").strip()
        if cnpj_dest:
            qs = qs.filter(cnpj_destinatario=normalizar_cnpj(cnpj_dest))

        cliente = (params.get("cliente") or params.get("fornecedor") or "").strip()
        if cliente:
            qs = qs.filter(nome_destinatario__icontains=cliente)

        return qs

    def _linha_entrada(self, doc):
        return {
            **DocumentoFiscalRecebidoSerializer(doc).data,
            "tipo_movimento": "ENTRADA",
            "tipo_documento": "NFE_PRODUTO",
            "participante_nome": doc.nome_emitente,
            "participante_cnpj": doc.cnpj_emitente,
            "objetivo": doc.objetivo_entrada,
        }

    def _linha_saida(self, doc):
        return {
            **DocumentoFiscalEmitidoSerializer(doc).data,
            "tipo_movimento": "SAIDA",
            "participante_nome": doc.nome_destinatario,
            "participante_cnpj": doc.cnpj_destinatario,
            "objetivo": doc.objetivo_saida,
        }

    def get(self, request):
        tipo_movimento = (request.query_params.get("tipo_movimento") or "ENTRADA").strip().upper()
        if tipo_movimento not in {"ENTRADA", "SAIDA", "TODOS"}:
            raise ValidationError({"tipo_movimento": "Tipo de movimento inválido."})

        entradas = self._queryset_entradas(request.query_params) if tipo_movimento in {"ENTRADA", "TODOS"} else []
        saidas = self._queryset_saidas(request.query_params) if tipo_movimento in {"SAIDA", "TODOS"} else []
        documentos = []
        valor_total = Decimal("0.00")
        por_objetivo_map: dict[tuple[str, str], dict] = {}

        for doc in list(entradas)[:1000]:
            documentos.append(self._linha_entrada(doc))
            valor_total += doc.valor_total or Decimal("0.00")
            row = por_objetivo_map.setdefault(
                ("ENTRADA", doc.objetivo_entrada),
                {
                    "tipo_movimento": "ENTRADA",
                    "objetivo": doc.objetivo_entrada,
                    "total_documentos": 0,
                    "valor_total": Decimal("0.00"),
                },
            )
            row["total_documentos"] += 1
            row["valor_total"] += doc.valor_total or Decimal("0.00")

        limite_saidas = max(0, 1000 - len(documentos))
        for doc in list(saidas)[:limite_saidas]:
            documentos.append(self._linha_saida(doc))
            valor_total += doc.valor_total or Decimal("0.00")
            row = por_objetivo_map.setdefault(
                ("SAIDA", doc.objetivo_saida),
                {
                    "tipo_movimento": "SAIDA",
                    "objetivo": doc.objetivo_saida,
                    "total_documentos": 0,
                    "valor_total": Decimal("0.00"),
                },
            )
            row["total_documentos"] += 1
            row["valor_total"] += doc.valor_total or Decimal("0.00")

        documentos.sort(key=lambda row: row.get("data_emissao") or "", reverse=True)
        payload = {
            "filtros": {
                "tipo_movimento": tipo_movimento,
                "data_inicio": (request.query_params.get("data_inicio") or "").strip(),
                "data_fim": (request.query_params.get("data_fim") or "").strip(),
                "objetivo_entrada": (request.query_params.get("objetivo_entrada") or "").strip(),
                "objetivo_saida": (request.query_params.get("objetivo_saida") or "").strip(),
                "cnpj_emitente": (request.query_params.get("cnpj_emitente") or "").strip(),
                "cnpj_destinatario": (request.query_params.get("cnpj_destinatario") or "").strip(),
                "fornecedor": (request.query_params.get("fornecedor") or "").strip(),
                "cliente": (request.query_params.get("cliente") or "").strip(),
            },
            "resumo": {
                "tipo_movimento": tipo_movimento,
                "total_documentos": len(documentos),
                "valor_total": valor_total,
                "por_objetivo": sorted(
                    por_objetivo_map.values(),
                    key=lambda row: (row["tipo_movimento"], row["objetivo"]),
                ),
            },
            "documentos": documentos,
        }
        return Response(RelatorioNFeSerializer(payload).data)


class ImportarXMLDocumentoEmitidoPortalView(APIView):
    """Importa XML de NF-e/NFS-e emitida pela ZFW pelo portal."""

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.MATERIAL_EDITAR_LISTA

    def post(self, request):
        serializer = ImportarXMLDocumentoEmitidoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        try:
            resultado = importar_xml_documento_emitido(
                xml=data["xml"],
                tipo_documento=data["tipo_documento"],
                objetivo_saida=data.get("objetivo_saida"),
                origem_importacao="MANUAL",
            )
        except DocumentoEmitidoParserError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        documento = resultado["documento"]
        status_code = status.HTTP_201_CREATED if resultado["created"] else status.HTTP_200_OK
        return Response(
            {
                "created": resultado["created"],
                "message": resultado["message"],
                "documento_id": documento.id,
                "identificador": documento.identificador,
            },
            status=status_code,
        )


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
                objetivo_entrada=data.get("objetivo_entrada"),
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
                objetivo_entrada=data.get("objetivo_entrada"),
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
