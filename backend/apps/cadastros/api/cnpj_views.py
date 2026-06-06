"""Endpoints de consulta e importacao de CNPJ via Brasil API."""
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.cadastros.api.serializers import ParceiroComercialSerializer
from apps.cadastros.models import ParceiroComercial
from apps.cadastros.services.brasilapi_cnpj import CnpjConsultaError, consultar_cnpj_brasilapi, normalizar_cnpj
from apps.cadastros.api.cnpj_throttling import CnpjConsultaThrottle
from apps.cadastros.services.cnpj_parceiro import consultar_e_atualizar_cnpj, consultar_e_salvar_cnpj
from core.permissions import PermissionKeys
from core.security.sanitize import sanitize_email, sanitize_optional_text, sanitize_phone


def _sanitize_email_override(raw) -> str | None:
    if raw is None:
        return None
    cleaned = sanitize_email(str(raw))
    return cleaned or None


def _sanitize_telefone_override(raw) -> str | None:
    if raw is None:
        return None
    cleaned = sanitize_phone(str(raw))
    return cleaned or None


class CnpjConsultaView(APIView):
    """Consulta CNPJ na Receita (preview, sem gravar)."""

    permission_classes = [HasEffectivePermission]
    throttle_classes = [CnpjConsultaThrottle]

    def required_permission(self, request, view):
        return PermissionKeys.CADASTRO_VISUALIZAR

    def get(self, request, cnpj: str):
        try:
            preview = consultar_cnpj_brasilapi(cnpj)
        except CnpjConsultaError as exc:
            return Response({"detail": str(exc)}, status=exc.status_code)

        existente = ParceiroComercial.objects.filter(documento=preview.documento).first()
        data = preview.as_dict()
        data["ja_cadastrado"] = existente is not None
        if existente:
            data["parceiro_existente_id"] = str(existente.id)
            data["parceiro_existente_nome"] = existente.razao_social
            data["parceiro_existente_eh_cliente"] = existente.eh_cliente
            data["parceiro_existente_eh_fornecedor"] = existente.eh_fornecedor
            data["parceiro_existente_eh_parceiro"] = existente.eh_parceiro
        return Response(data)


class CnpjSalvarView(APIView):
    """Consulta CNPJ e persiste parceiro com papeis escolhidos."""

    permission_classes = [HasEffectivePermission]
    throttle_classes = [CnpjConsultaThrottle]

    def required_permission(self, request, view):
        return PermissionKeys.CADASTRO_EDITAR

    def post(self, request, cnpj: str):
        body = request.data if isinstance(request.data, dict) else {}
        try:
            parceiro, preview, aviso = consultar_e_salvar_cnpj(
                cnpj,
                eh_cliente=bool(body.get("eh_cliente")),
                eh_fornecedor=bool(body.get("eh_fornecedor")),
                eh_parceiro=bool(body.get("eh_parceiro")),
                inscricao_estadual=sanitize_optional_text(body.get("inscricao_estadual"), 20) or "",
                email_override=_sanitize_email_override(body.get("email")),
                telefone_override=_sanitize_telefone_override(body.get("telefone")),
                razao_social_override=sanitize_optional_text(body.get("razao_social"), 255),
                nome_fantasia_override=sanitize_optional_text(body.get("nome_fantasia"), 255),
            )
        except CnpjConsultaError as exc:
            payload = {"detail": str(exc)}
            if exc.status_code == 409:
                try:
                    doc = normalizar_cnpj(cnpj)
                    existente = ParceiroComercial.objects.filter(documento=doc).first()
                    if existente:
                        payload["parceiro_existente_id"] = str(existente.id)
                except CnpjConsultaError:
                    pass
            return Response(payload, status=exc.status_code)

        parceiro = get_object_or_404(
            ParceiroComercial.objects.prefetch_related("enderecos", "contatos", "cnaes", "socios"),
            pk=parceiro.pk,
        )
        response_data = {
            "parceiro": ParceiroComercialSerializer(parceiro).data,
            "consulta": preview.as_dict(),
        }
        if aviso:
            response_data["aviso"] = aviso
        return Response(response_data, status=status.HTTP_201_CREATED)


class CnpjAtualizarView(APIView):
    """Reconsulta CNPJ na Receita e atualiza cadastro existente."""

    permission_classes = [HasEffectivePermission]
    throttle_classes = [CnpjConsultaThrottle]

    def required_permission(self, request, view):
        return PermissionKeys.CADASTRO_EDITAR

    def post(self, request, cnpj: str):
        body = request.data if isinstance(request.data, dict) else {}
        parceiro_id = body.get("parceiro_id")
        if not parceiro_id:
            return Response(
                {"detail": "Informe o parceiro_id do cadastro a atualizar."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            parceiro, preview, aviso = consultar_e_atualizar_cnpj(
                cnpj,
                parceiro_id,
                eh_cliente=bool(body.get("eh_cliente")),
                eh_fornecedor=bool(body.get("eh_fornecedor")),
                eh_parceiro=bool(body.get("eh_parceiro")),
                inscricao_estadual=sanitize_optional_text(body.get("inscricao_estadual"), 20),
                email_override=_sanitize_email_override(body.get("email")),
                telefone_override=_sanitize_telefone_override(body.get("telefone")),
                razao_social_override=sanitize_optional_text(body.get("razao_social"), 255),
                nome_fantasia_override=sanitize_optional_text(body.get("nome_fantasia"), 255),
            )
        except CnpjConsultaError as exc:
            return Response({"detail": str(exc)}, status=exc.status_code)

        parceiro = get_object_or_404(
            ParceiroComercial.objects.prefetch_related("enderecos", "contatos", "cnaes", "socios"),
            pk=parceiro.pk,
        )
        response_data = {
            "parceiro": ParceiroComercialSerializer(parceiro).data,
            "consulta": preview.as_dict(),
        }
        if aviso:
            response_data["aviso"] = aviso
        return Response(response_data)
