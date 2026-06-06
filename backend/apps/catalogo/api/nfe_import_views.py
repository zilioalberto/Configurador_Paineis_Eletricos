"""Endpoints de importação de NF-e para o catálogo (preview, aplicar, fornecedores)."""

from django.core.exceptions import ValidationError
from django.db.models import Q
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.catalogo.api.nfe_import_serializers import NfeCatalogoAplicarSerializer
from apps.cadastros.models import ParceiroComercial
from apps.catalogo.services.nfe_catalogo_apply import aplicar_importacao_nfe
from apps.catalogo.services.nfe_catalogo_parser import parse_nfe_xml_bytes
from core.permissions import PermissionKeys


def _fornecedor_payload(obj: ParceiroComercial) -> dict:
    return {
        "id": str(obj.id),
        "razao_social": obj.razao_social,
        "cnpj": obj.documento,
    }


class NfeCatalogoFornecedoresView(APIView):
    """Lista fornecedores para seleção no fluxo de importação de NF-e."""

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.MATERIAL_EDITAR_LISTA

    def get(self, request):
        search = (request.query_params.get("search") or "").strip()
        qs = ParceiroComercial.objects.filter(eh_fornecedor=True, ativo=True).order_by(
            "razao_social",
            "documento",
        )
        if search:
            qs = qs.filter(
                Q(razao_social__icontains=search)
                | Q(nome_fantasia__icontains=search)
                | Q(documento__icontains=search)
            )
        return Response([_fornecedor_payload(obj) for obj in qs[:80]])


class NfeCatalogoPreviewView(APIView):
    """
    Envia o XML da NF-e (campo multipart `arquivo`) e recebe dados do emitente e itens
    para conferência antes de importar fornecedor/produtos.

    Mesma permissão que «aplicar»: apenas quem pode editar a lista de materiais usa este fluxo
    (alinhado à rota `/catalogo/importar-nfe` no frontend).
    """

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.MATERIAL_EDITAR_LISTA
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request):
        upload = request.FILES.get("arquivo")
        if not upload:
            return Response(
                {"detail": "Campo obrigatório: arquivo (XML da NF-e)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            snapshot = parse_nfe_xml_bytes(upload.read())
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        from apps.catalogo.services.nfe_catalogo_preview_enrich import (
            enrich_snapshot_itens_com_produto_existente,
        )

        enrich_snapshot_itens_com_produto_existente(snapshot)
        fornecedor_catalogo = None
        cnpj = (snapshot.get("emitente") or {}).get("cnpj") or ""
        if len(cnpj) == 14:
            existente = ParceiroComercial.objects.filter(
                documento=cnpj,
                eh_fornecedor=True,
            ).first()
            if existente:
                fornecedor_catalogo = _fornecedor_payload(existente)

        return Response(
            {
                "snapshot": snapshot,
                "fornecedor_catalogo": fornecedor_catalogo,
            }
        )


class NfeCatalogoProdutoResumoView(APIView):
    """Resumo do produto do catálogo por código (para importação NF-e ao alterar o código sugerido)."""

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.MATERIAL_EDITAR_LISTA

    def get(self, request):
        from apps.catalogo.services.nfe_catalogo_preview_enrich import lookup_produto_resumo_por_codigo

        codigo = (request.query_params.get("codigo") or "").strip()
        if not codigo:
            return Response({"produto": None})
        return Response({"produto": lookup_produto_resumo_por_codigo(codigo)})


class NfeCatalogoAplicarView(APIView):
    """Aplica importação (fornecedor opcional + produtos marcados)."""

    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.MATERIAL_EDITAR_LISTA

    def post(self, request):
        ser = NfeCatalogoAplicarSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        dados = ser.validated_data
        try:
            resultado = aplicar_importacao_nfe(
                snapshot=dados["snapshot"],
                criar_fornecedor=dados.get("criar_fornecedor", False),
                fornecedor_id=dados.get("fornecedor_id"),
                categoria_padrao=dados.get("categoria_padrao") or "",
                fabricante_padrao=dados.get("fabricante_padrao") or "",
                itens=dados["itens"],
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        except ValidationError as exc:
            return Response(
                {"detail": exc.message_dict if hasattr(exc, "message_dict") else str(exc)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        return Response(
            {
                "fornecedor_id": resultado.fornecedor_id,
                "fornecedor_criado": resultado.fornecedor_criado,
                "fornecedor_ids": resultado.fornecedor_ids,
                "fornecedores_associados": resultado.fornecedores_associados,
                "produtos_criados": resultado.produtos_criados,
                "produtos_atualizados": resultado.produtos_atualizados,
                "produtos_ignorados": resultado.produtos_ignorados,
                "avisos": resultado.avisos,
            },
            status=status.HTTP_200_OK,
        )
