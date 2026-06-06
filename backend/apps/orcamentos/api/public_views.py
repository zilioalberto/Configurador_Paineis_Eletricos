"""API pública da oferta (sem autenticação) — link enviado ao cliente."""
from __future__ import annotations

from django.utils import timezone
from rest_framework import status
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orcamentos.api.action_serializers import ResponderOfertaPublicaSerializer
from apps.orcamentos.models import DecisaoOfertaClienteChoices
from apps.orcamentos.services.convite_oferta import obter_convite_por_token
from apps.orcamentos.services.preview_oferta_snapshot import montar_preview_oferta_snapshot
from apps.orcamentos.services.responder_oferta_publica import (
    anexar_pdf_assinado_cliente,
    registrar_resposta_oferta_publica,
)


def _client_ip(request) -> str | None:
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


class OfertaPublicaDetailView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def get(self, request, token):
        try:
            convite = obter_convite_por_token(token)
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_404_NOT_FOUND)

        resposta = getattr(convite, "resposta", None)
        preview = montar_preview_oferta_snapshot(convite.snapshot)
        return Response(
            {
                "preview": preview,
                "valido_ate": convite.valido_ate.isoformat(),
                "codigo": convite.orcamento.codigo,
                "resposta": {
                    "decisao": resposta.decisao if resposta else DecisaoOfertaClienteChoices.PENDENTE,
                    "nome_responsavel": resposta.nome_responsavel if resposta else "",
                    "aceite_em": resposta.aceite_em.isoformat() if resposta and resposta.aceite_em else None,
                    "observacao": resposta.observacao if resposta else "",
                },
            }
        )


class OfertaPublicaResponderView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request, token):
        ser = ResponderOfertaPublicaSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            resposta = registrar_resposta_oferta_publica(
                token,
                decisao=ser.validated_data["decisao"],
                nome_responsavel=ser.validated_data["nome_responsavel"],
                cargo=ser.validated_data.get("cargo", ""),
                email=ser.validated_data.get("email", ""),
                observacao=ser.validated_data.get("observacao", ""),
                assinatura_data_url=ser.validated_data.get("assinatura_data_url", ""),
                ip=_client_ip(request),
                user_agent=request.META.get("HTTP_USER_AGENT", ""),
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "decisao": resposta.decisao,
                "aceite_em": resposta.aceite_em.isoformat() if resposta.aceite_em else None,
                "mensagem": (
                    "Proposta aprovada. Obrigado!"
                    if resposta.decisao == DecisaoOfertaClienteChoices.APROVADO
                    else "Resposta registrada."
                ),
            },
            status=status.HTTP_200_OK,
        )


class OfertaPublicaPdfAssinadoView(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, token):
        arquivo = request.FILES.get("arquivo")
        if not arquivo:
            return Response(
                {"detail": "Envie o arquivo PDF assinado."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not (arquivo.name or "").lower().endswith(".pdf"):
            return Response(
                {"detail": "O arquivo deve ser PDF."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            registro = anexar_pdf_assinado_cliente(
                token,
                arquivo_bytes=arquivo.read(),
                nome_original=arquivo.name or "proposta_assinada.pdf",
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        return Response(
            {
                "id": str(registro.id),
                "nome_original": registro.nome_original,
                "recebido_em": timezone.now().isoformat(),
            },
            status=status.HTTP_201_CREATED,
        )
