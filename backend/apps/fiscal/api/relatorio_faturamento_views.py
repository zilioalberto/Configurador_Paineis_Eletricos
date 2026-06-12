"""API — relatórios e dashboard de faturamento (NF-es emitidas)."""
from __future__ import annotations

from datetime import date

from django.conf import settings
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.services.relatorio_faturamento import montar_relatorio_faturamento
from apps.fiscal.utils import normalizar_cnpj
from core.permissions import PermissionKeys


def _cnpj_empresa() -> str:
    cnpj = normalizar_cnpj(getattr(settings, "FISCAL_EMPRESA_CNPJ", "") or "")
    if len(cnpj) != 14:
        return ""
    return cnpj


def _parse_data_param(raw: str) -> date | None:
    texto = (raw or "").strip()
    if not texto:
        return None
    try:
        return date.fromisoformat(texto[:10])
    except ValueError:
        return None


class RelatorioFaturamentoView(APIView):
    """
    Faturamento agregado por mês e por cliente (destinatário das NF-es emitidas).
    Base: documentos importados com incluir_faturamento=True.
    """

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

        params = request.query_params
        try:
            top_clientes = int((params.get("top_clientes") or "25").strip())
        except ValueError:
            top_clientes = 25
        top_clientes = max(1, min(top_clientes, 100))

        incluir_documentos = (params.get("incluir_documentos") or "true").strip().lower() not in {
            "false",
            "0",
            "nao",
            "não",
        }

        try:
            limite_documentos = int((params.get("limite_documentos") or "500").strip())
        except ValueError:
            limite_documentos = 500
        limite_documentos = max(0, min(limite_documentos, 2000))

        payload = montar_relatorio_faturamento(
            cnpj=cnpj,
            data_inicio=_parse_data_param(params.get("data_inicio")),
            data_fim=_parse_data_param(params.get("data_fim")),
            cliente=(params.get("cliente") or "").strip(),
            objetivo_saida=(params.get("objetivo_saida") or "").strip(),
            anexo_simples=(params.get("anexo_simples") or "").strip(),
            tipo_documento=(params.get("tipo_documento") or "").strip(),
            top_clientes=top_clientes,
            incluir_documentos=incluir_documentos,
            limite_documentos=limite_documentos,
        )
        payload["cnpj"] = cnpj
        return Response(payload)
