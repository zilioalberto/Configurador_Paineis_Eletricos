"""API REST — gestão de obrigações fiscais mensais."""
from __future__ import annotations

from django.conf import settings
from django.db.models import Count, Sum
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ReadOnlyModelViewSet

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.api.obrigacoes_serializers import (
    CriarPacoteSerializer,
    HoleriteCompetenciaSerializer,
    HoleriteCompetenciaUpdateSerializer,
    MarcarPagoSerializer,
    ObrigacaoFiscalSerializer,
    ObrigacaoFiscalUpdateSerializer,
    PacoteObrigacaoFiscalDetailSerializer,
    PacoteObrigacaoFiscalListSerializer,
    ReconciliacaoContabilidadeUpdateSerializer,
    ReconciliacaoFiscalSerializer,
    UploadAnexoPacoteSerializer,
)
from apps.fiscal.models_obrigacoes import (
    AnexoObrigacaoFiscal,
    HoleriteCompetencia,
    ObrigacaoFiscal,
    PacoteObrigacaoFiscal,
)
from apps.fiscal.api.nfe_views import DocumentoFiscalPagination
from apps.fiscal.services.fiscal_empresa import MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO
from apps.fiscal.services.obrigacoes.dashboard import montar_dashboard_obrigacoes
from apps.fiscal.services.obrigacoes.holerites_rh import (
    conciliar_holerites_rh_pacote,
    criar_colaboradores_holerites_faltantes,
)
from apps.fiscal.services.obrigacoes.importar_pacote import (
    excluir_anexo_obrigacao,
    excluir_todos_anexos_pacote,
    importar_anexo_pdf,
    marcar_obrigacao_paga,
    obter_ou_criar_pacote,
)
from apps.fiscal.services.obrigacoes.contabilidade_manual import (
    TIPOS_EDITAVEIS,
    aplicar_contabilidade_manual_e_reconciliar,
)
from apps.fiscal.services.obrigacoes.reconciliacao import executar_reconciliacao_pacote
from apps.fiscal.utils import normalizar_cnpj
from core.permissions import PermissionKeys


def _cnpj_empresa() -> str:
    cnpj = normalizar_cnpj(getattr(settings, "FISCAL_EMPRESA_CNPJ", "") or "")
    return cnpj if len(cnpj) == 14 else ""


class DashboardObrigacoesView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get(self, request):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(montar_dashboard_obrigacoes(cnpj=cnpj))


class PacoteObrigacaoFiscalViewSet(ReadOnlyModelViewSet):
    permission_classes = [HasEffectivePermission]
    lookup_field = "public_id"
    pagination_class = DocumentoFiscalPagination

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_VISUALIZAR

    def get_queryset(self):
        cnpj = _cnpj_empresa()
        qs = PacoteObrigacaoFiscal.objects.filter(cnpj=cnpj).annotate(
            total_obrigacoes=Count("obrigacoes"),
            total_pendente=Sum("obrigacoes__valor"),
        )
        return qs.prefetch_related(
            "obrigacoes__linhas_composicao",
            "obrigacoes__lancamento_financeiro",
            "anexos",
            "holerites__colaborador",
            "reconciliacoes",
            "snapshot_icms",
        )

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PacoteObrigacaoFiscalDetailSerializer
        return PacoteObrigacaoFiscalListSerializer

    def list(self, request, *args, **kwargs):
        if not _cnpj_empresa():
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return super().list(request, *args, **kwargs)


class CriarPacoteObrigacaoView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        ser = CriarPacoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        pacote = obter_ou_criar_pacote(cnpj=cnpj, competencia=ser.validated_data["competencia"])
        if ser.validated_data.get("observacoes"):
            pacote.observacoes = ser.validated_data["observacoes"]
            pacote.save(update_fields=["observacoes", "atualizado_em"])
        return Response(
            PacoteObrigacaoFiscalDetailSerializer(pacote, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )


class UploadAnexoPacoteView(APIView):
    permission_classes = [HasEffectivePermission]
    parser_classes = [MultiPartParser, FormParser]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request, public_id):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pacote = get_object_or_404(PacoteObrigacaoFiscal, public_id=public_id, cnpj=cnpj)
        ser = UploadAnexoPacoteSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        arquivo = ser.validated_data["arquivo"]
        tipo_forcado = (ser.validated_data.get("tipo_forcado") or "").strip() or None
        resultado = importar_anexo_pdf(
            pacote=pacote,
            arquivo=arquivo,
            nome_original=arquivo.name,
            tipo_forcado=tipo_forcado,
        )
        executar_reconciliacao_pacote(pacote)
        pacote.refresh_from_db()
        return Response(
            {
                **resultado,
                "pacote": PacoteObrigacaoFiscalDetailSerializer(
                    pacote, context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )


class ReconciliarPacoteView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request, public_id):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pacote = get_object_or_404(PacoteObrigacaoFiscal, public_id=public_id, cnpj=cnpj)
        reconciliacoes = executar_reconciliacao_pacote(pacote)
        pacote.refresh_from_db()
        return Response(
            {
                "reconciliacoes": ReconciliacaoFiscalSerializer(reconciliacoes, many=True).data,
                "pacote": PacoteObrigacaoFiscalDetailSerializer(
                    pacote, context={"request": request}
                ).data,
            }
        )


class ReconciliacaoContabilidadeView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def patch(self, request, public_id, tipo):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if tipo not in TIPOS_EDITAVEIS:
            return Response(
                {"detail": "Tipo de conciliação não editável."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pacote = get_object_or_404(PacoteObrigacaoFiscal, public_id=public_id, cnpj=cnpj)
        ser = ReconciliacaoContabilidadeUpdateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        data = ser.validated_data
        try:
            rec = aplicar_contabilidade_manual_e_reconciliar(
                pacote,
                tipo,
                valor=data.get("valor_contabilidade"),
                icms_entradas=data.get("icms_entradas"),
                icms_saidas=data.get("icms_saidas"),
                limpar=data.get("limpar", False),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)
        pacote.refresh_from_db()
        return Response(
            {
                "reconciliacao": ReconciliacaoFiscalSerializer(rec).data,
                "pacote": PacoteObrigacaoFiscalDetailSerializer(
                    pacote, context={"request": request}
                ).data,
            }
        )


class ObrigacaoFiscalDetailView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method in {"PATCH", "PUT", "POST"}:
            return PermissionKeys.FISCAL_EDITAR
        return PermissionKeys.FISCAL_VISUALIZAR

    def get(self, request, public_id):
        cnpj = _cnpj_empresa()
        obrigacao = get_object_or_404(
            ObrigacaoFiscal,
            public_id=public_id,
            pacote__cnpj=cnpj,
        )
        return Response(ObrigacaoFiscalSerializer(obrigacao).data)

    def patch(self, request, public_id):
        cnpj = _cnpj_empresa()
        obrigacao = get_object_or_404(
            ObrigacaoFiscal,
            public_id=public_id,
            pacote__cnpj=cnpj,
        )
        ser = ObrigacaoFiscalUpdateSerializer(obrigacao, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        executar_reconciliacao_pacote(obrigacao.pacote)
        obrigacao.refresh_from_db()
        return Response(ObrigacaoFiscalSerializer(obrigacao).data)

    def post(self, request, public_id):
        """Marcar obrigação como paga (+ lançamento financeiro)."""
        cnpj = _cnpj_empresa()
        obrigacao = get_object_or_404(
            ObrigacaoFiscal,
            public_id=public_id,
            pacote__cnpj=cnpj,
        )
        ser = MarcarPagoSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        marcar_obrigacao_paga(
            obrigacao=obrigacao,
            data_pagamento=ser.validated_data.get("data_pagamento"),
            criar_lancamento_financeiro=ser.validated_data.get("criar_lancamento_financeiro", True),
            conta=ser.validated_data.get("conta") or "Impostos",
            centro_custo=ser.validated_data.get("centro_custo") or "Administrativo",
        )
        obrigacao.refresh_from_db()
        return Response(ObrigacaoFiscalSerializer(obrigacao).data)


class AnexoObrigacaoFiscalDetailView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def delete(self, request, public_id):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        anexo = get_object_or_404(
            AnexoObrigacaoFiscal,
            public_id=public_id,
            pacote__cnpj=cnpj,
        )
        excluir_anexo_obrigacao(anexo)
        return Response(status=status.HTTP_204_NO_CONTENT)


class ExcluirTodosAnexosPacoteView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def delete(self, request, public_id):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pacote = get_object_or_404(PacoteObrigacaoFiscal, public_id=public_id, cnpj=cnpj)
        excluidos = excluir_todos_anexos_pacote(pacote)
        pacote.refresh_from_db()
        return Response(
            {
                "excluidos": excluidos,
                "pacote": PacoteObrigacaoFiscalDetailSerializer(
                    pacote, context={"request": request}
                ).data,
            }
        )


class HoleriteCompetenciaDetailView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if request.method in {"PATCH", "PUT"}:
            return PermissionKeys.FISCAL_EDITAR
        return PermissionKeys.FISCAL_VISUALIZAR

    def patch(self, request, holerite_id):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        holerite = get_object_or_404(HoleriteCompetencia, id=holerite_id, pacote__cnpj=cnpj)
        ser = HoleriteCompetenciaUpdateSerializer(holerite, data=request.data, partial=True)
        ser.is_valid(raise_exception=True)
        ser.save()
        holerite.refresh_from_db()
        return Response(HoleriteCompetenciaSerializer(holerite).data)


class ConciliarHoleritesRhPacoteView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request, public_id):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pacote = get_object_or_404(PacoteObrigacaoFiscal, public_id=public_id, cnpj=cnpj)
        resultado = conciliar_holerites_rh_pacote(pacote)
        pacote.refresh_from_db()
        return Response(
            {
                **resultado,
                "pacote": PacoteObrigacaoFiscalDetailSerializer(
                    pacote, context={"request": request}
                ).data,
            }
        )


class CriarColaboradoresHoleritesPacoteView(APIView):
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request, public_id):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pacote = get_object_or_404(PacoteObrigacaoFiscal, public_id=public_id, cnpj=cnpj)
        holerite_id = request.data.get("holerite_id")
        if holerite_id is not None:
            try:
                holerite_id = int(holerite_id)
            except (TypeError, ValueError):
                return Response(
                    {"detail": "holerite_id inválido."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
        resultado = criar_colaboradores_holerites_faltantes(pacote, holerite_id=holerite_id)
        pacote.refresh_from_db()
        return Response(
            {
                **resultado,
                "pacote": PacoteObrigacaoFiscalDetailSerializer(
                    pacote, context={"request": request}
                ).data,
            }
        )


class UploadLotePacoteView(APIView):
    """Upload de múltiplos PDFs de uma vez (pacote contabilidade)."""

    permission_classes = [HasEffectivePermission]
    parser_classes = [MultiPartParser, FormParser]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request, public_id):
        cnpj = _cnpj_empresa()
        if not cnpj:
            return Response(
                {"detail": MSG_FISCAL_EMPRESA_CNPJ_NAO_CONFIGURADO},
                status=status.HTTP_400_BAD_REQUEST,
            )
        pacote = get_object_or_404(PacoteObrigacaoFiscal, public_id=public_id, cnpj=cnpj)
        arquivos = request.FILES.getlist("arquivos") or request.FILES.getlist("arquivo")
        if not arquivos:
            return Response({"detail": "Envie um ou mais arquivos PDF."}, status=status.HTTP_400_BAD_REQUEST)
        resultados = []
        for arquivo in arquivos:
            resultados.append(
                importar_anexo_pdf(
                    pacote=pacote,
                    arquivo=arquivo,
                    nome_original=arquivo.name,
                )
            )
        executar_reconciliacao_pacote(pacote)
        pacote.refresh_from_db()
        return Response(
            {
                "importados": len(resultados),
                "resultados": resultados,
                "pacote": PacoteObrigacaoFiscalDetailSerializer(
                    pacote, context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )
