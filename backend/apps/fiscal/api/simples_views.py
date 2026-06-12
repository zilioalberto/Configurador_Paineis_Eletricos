"""API — Simples Nacional: perfil, faturamento e projeção de DAS."""
from __future__ import annotations

from datetime import date

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.simples_serializers import (
    ClassificacaoDocumentoEmitidoSerializer,
    FaturamentoMensalAjusteSerializer,
    ImportarLoteDocumentosEmitidosSerializer,
    PerfilTributarioSimplesSerializer,
    ReclassificarDocumentosEmitidosSerializer,
)
from apps.fiscal.choices import ClassificacaoFiscalOrigemChoices
from apps.fiscal.models import DocumentoFiscalEmitido, FaturamentoMensalAjuste, PerfilTributarioSimples
from apps.fiscal.services.classificar_documento_emitido import classificar_documento_emitido
from apps.fiscal.services.faturamento_simples import agregar_faturamento_mensal, montar_projecao_das
from apps.fiscal.services.importar_lote_documentos_emitidos import importar_lote_xmls_emitidos
from apps.fiscal.utils import normalizar_cnpj
from core.permissions import PermissionKeys


def _cnpj_empresa() -> str:
    cnpj = normalizar_cnpj(getattr(settings, "FISCAL_EMPRESA_CNPJ", "") or "")
    if len(cnpj) != 14:
        return ""
    return cnpj


def _obter_ou_criar_perfil(cnpj: str) -> PerfilTributarioSimples:
    perfil, _ = PerfilTributarioSimples.objects.get_or_create(cnpj=cnpj)
    return perfil


class PerfilTributarioSimplesView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method in {"GET", "HEAD"}:
            return PermissionKeys.FISCAL_VISUALIZAR
        return PermissionKeys.FISCAL_EDITAR

    def get(self, request):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": "FISCAL_EMPRESA_CNPJ não configurado no servidor."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        perfil = _obter_ou_criar_perfil(cnpj)
        return Response(PerfilTributarioSimplesSerializer(perfil).data)

    def patch(self, request):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": "FISCAL_EMPRESA_CNPJ não configurado no servidor."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        perfil = _obter_ou_criar_perfil(cnpj)
        serializer = PerfilTributarioSimplesSerializer(
            perfil,
            data=request.data,
            partial=True,
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(PerfilTributarioSimplesSerializer(perfil).data)


class FaturamentoSimplesView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get(self, request):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": "FISCAL_EMPRESA_CNPJ não configurado no servidor."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        ref_raw = (request.query_params.get("data_referencia") or "").strip()
        data_ref = date.fromisoformat(ref_raw) if ref_raw else date.today()
        linhas = agregar_faturamento_mensal(cnpj, data_ref)
        rbt12 = sum(row["valor_total"] for row in linhas)
        return Response(
            {
                "cnpj": cnpj,
                "data_referencia": data_ref.isoformat(),
                "rbt12_total": str(rbt12),
                "meses": linhas,
            }
        )


class ProjecaoDasSimplesView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get(self, request):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": "FISCAL_EMPRESA_CNPJ não configurado no servidor."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        competencia = (request.query_params.get("competencia") or "").strip()
        if not competencia:
            hoje = date.today()
            competencia = f"{hoje.year:04d}-{hoje.month:02d}"
        ref_raw = (request.query_params.get("data_referencia") or "").strip()
        data_ref = date.fromisoformat(ref_raw) if ref_raw else date.today()
        perfil = _obter_ou_criar_perfil(cnpj)
        try:
            payload = montar_projecao_das(
                cnpj=cnpj,
                perfil=perfil,
                competencia=competencia,
                data_referencia=data_ref,
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        payload["cnpj"] = cnpj
        payload["perfil"] = PerfilTributarioSimplesSerializer(perfil).data
        return Response(payload)


class FaturamentoMensalAjusteView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def put(self, request):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": "FISCAL_EMPRESA_CNPJ não configurado no servidor."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )
        serializer = FaturamentoMensalAjusteSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        obj, _ = FaturamentoMensalAjuste.objects.update_or_create(
            cnpj=cnpj,
            competencia=data["competencia"],
            defaults={
                "valor_ajuste": data["valor_ajuste"],
                "observacao": data.get("observacao") or "",
            },
        )
        return Response(FaturamentoMensalAjusteSerializer(obj).data)


class ImportarLoteDocumentosEmitidosView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        serializer = ImportarLoteDocumentosEmitidosSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resultado = importar_lote_xmls_emitidos(
            data["xmls"],
            classificar_automaticamente=data.get("classificar_automaticamente", True),
        )
        status_code = status.HTTP_201_CREATED if resultado["criados"] else status.HTTP_200_OK
        return Response(resultado, status=status_code)


class ReclassificarDocumentosEmitidosView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        serializer = ReclassificarDocumentosEmitidosSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ids = serializer.validated_data.get("documento_ids") or []
        qs = DocumentoFiscalEmitido.objects.all()
        if ids:
            qs = qs.filter(pk__in=ids)
        total = 0
        for documento in qs.iterator():
            classificar_documento_emitido(documento, forcar=True)
            total += 1
        return Response({"reclassificados": total})


class ClassificacaoDocumentoEmitidoView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def patch(self, request, public_id):
        try:
            documento = DocumentoFiscalEmitido.objects.get(public_id=public_id)
        except DocumentoFiscalEmitido.DoesNotExist:
            return Response(status=status.HTTP_404_NOT_FOUND)

        serializer = ClassificacaoDocumentoEmitidoSerializer(data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        update_fields = ["classificacao_origem", "atualizada_em"]
        documento.classificacao_origem = ClassificacaoFiscalOrigemChoices.MANUAL
        if "objetivo_saida" in data:
            documento.objetivo_saida = data["objetivo_saida"]
            update_fields.append("objetivo_saida")
        if "anexo_simples" in data:
            documento.anexo_simples = data["anexo_simples"] or ""
            update_fields.append("anexo_simples")
        if "incluir_faturamento" in data:
            documento.incluir_faturamento = data["incluir_faturamento"]
            update_fields.append("incluir_faturamento")
        documento.save(update_fields=update_fields)
        from apps.fiscal.api.nfe_serializers import DocumentoFiscalEmitidoSerializer

        return Response(DocumentoFiscalEmitidoSerializer(documento).data)
