"""Sincronização manual de NF-es na SEFAZ (portal JWT)."""
from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.services.sefaz import executar_sincronizacao_nsu, get_sefaz_config
from core.permissions import PermissionKeys


class SincronizarNfesSefazView(APIView):
    """
    Dispara DistDFe + importação de XMLs + manifestações pendentes.
    Usa certificado A1 configurado no servidor (FISCAL_CERT_PATH).
    """

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        config = get_sefaz_config()
        try:
            config.validate()
        except (ValueError, FileNotFoundError) as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        if len(config.cnpj) != 14:
            return Response(
                {"detail": "Configure FISCAL_EMPRESA_CNPJ no servidor (14 dígitos)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        resultado = executar_sincronizacao_nsu(config=config)
        payload = {
            "sucesso": resultado.sucesso,
            "mensagem": resultado.mensagem,
            "ciclos_executados": resultado.ciclos_executados,
            "documentos_importados": resultado.documentos_importados,
            "documentos_novos": resultado.documentos_novos,
            "documentos_duplicados": resultado.documentos_duplicados,
            "erros_importacao": resultado.erros_importacao,
            "ultimo_cstat": resultado.ultimo_cstat,
            "ultimo_nsu": resultado.ultimo_nsu,
            "max_nsu": resultado.max_nsu,
            "manifestacoes_processadas": resultado.manifestacoes_processadas,
        }
        status_code = (
            status.HTTP_200_OK if resultado.sucesso else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        return Response(payload, status=status_code)
