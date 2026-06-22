"""Sincronização manual de NF-es na SEFAZ (portal JWT)."""
import logging
import re

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.api.permissions import HasEffectivePermission
from apps.fiscal.services.sefaz import executar_sincronizacao_nsu, get_sefaz_config
from apps.fiscal.services.sefaz.certificado import CertificadoA1
from apps.fiscal.services.sefaz.importar_por_chave import importar_nfe_por_chave
from apps.fiscal.services.sefaz.status import montar_status_sefaz_sync
from apps.fiscal.services.sefaz.sync_feedback import montar_detail_sincronizacao
from core.permissions import PermissionKeys

logger = logging.getLogger(__name__)

_MAX_CHAVES_POR_REQUISICAO = 50


def _extrair_chaves(data) -> list[str]:
    """Aceita ``chaves`` (lista ou texto) e/ou ``chave`` (texto) e normaliza para 44 dígitos."""
    bruto: list[str] = []
    entrada = data.get("chaves") if hasattr(data, "get") else None
    if isinstance(entrada, str):
        bruto.extend(re.split(r"[\s,;]+", entrada))
    elif isinstance(entrada, (list, tuple)):
        bruto.extend(str(item) for item in entrada)
    unica = data.get("chave") if hasattr(data, "get") else None
    if isinstance(unica, str):
        bruto.append(unica)

    chaves: list[str] = []
    vistas: set[str] = set()
    for item in bruto:
        digitos = "".join(ch for ch in item if ch.isdigit())
        if len(digitos) == 44 and digitos not in vistas:
            vistas.add(digitos)
            chaves.append(digitos)
    return chaves


class SincronizarNfesSefazView(APIView):
    """
    Dispara DistDFe + importação de XMLs + manifestações pendentes.
    Usa certificado A1 configurado no servidor (FISCAL_CERT_PATH).
    """

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        sefaz_status = montar_status_sefaz_sync()
        if not sefaz_status.sefaz_sync_disponivel:
            return Response(
                {"detail": sefaz_status.sefaz_sync_mensagem},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

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

        try:
            resultado = executar_sincronizacao_nsu(config=config)
        except Exception:
            logger.exception("Falha inesperada na sincronização SEFAZ")
            return Response(
                {
                    "detail": (
                        "Erro interno ao sincronizar com a SEFAZ. "
                        "Verifique os logs do servidor."
                    )
                },
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        payload = {
            "sucesso": resultado.sucesso,
            "mensagem": resultado.mensagem,
            "ciclos_executados": resultado.ciclos_executados,
            "documentos_importados": resultado.documentos_importados,
            "documentos_novos": resultado.documentos_novos,
            "documentos_duplicados": resultado.documentos_duplicados,
            "resumos_armazenados": resultado.resumos_armazenados,
            "resumos_novos": resultado.resumos_novos,
            "documentos_ignorados": resultado.documentos_ignorados,
            "schemas_ignorados": resultado.schemas_ignorados,
            "erros_importacao": resultado.erros_importacao,
            "alertas": resultado.alertas,
            "ultimo_cstat": resultado.ultimo_cstat,
            "ultimo_motivo": resultado.ultimo_motivo,
            "ultimo_nsu": resultado.ultimo_nsu,
            "max_nsu": resultado.max_nsu,
            "manifestacoes_processadas": resultado.manifestacoes_processadas,
            "ciencias_solicitadas": resultado.ciencias_solicitadas,
        }
        if not resultado.sucesso:
            payload["detail"] = montar_detail_sincronizacao(resultado)
        status_code = (
            status.HTTP_200_OK if resultado.sucesso else status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        return Response(payload, status=status_code)


class ImportarNfePorChaveSefazView(APIView):
    """Importa NF-e(s) recebida(s) pela chave de acesso (consChNFe).

    Consulta pontual que não avança o cursor NSU — útil para recuperar notas
    retroativas cujas chaves de 44 dígitos sejam conhecidas.
    """

    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        return PermissionKeys.FISCAL_EDITAR

    def post(self, request):
        chaves = _extrair_chaves(request.data)
        if not chaves:
            return Response(
                {"detail": "Informe ao menos uma chave de acesso válida (44 dígitos)."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(chaves) > _MAX_CHAVES_POR_REQUISICAO:
            return Response(
                {
                    "detail": (
                        f"Máximo de {_MAX_CHAVES_POR_REQUISICAO} chaves por requisição. "
                        "Envie em lotes menores."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        sefaz_status = montar_status_sefaz_sync()
        if not sefaz_status.sefaz_sync_disponivel:
            return Response(
                {"detail": sefaz_status.sefaz_sync_mensagem},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

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

        certificado = None
        if config.provider not in {"stub", "homolog"}:
            try:
                certificado = CertificadoA1.carregar(config.cert_path, config.cert_password)
            except (ValueError, FileNotFoundError) as exc:
                return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        resultados = []
        for chave in chaves:
            try:
                resultados.append(
                    importar_nfe_por_chave(chave, config=config, certificado=certificado)
                )
            except Exception:
                logger.exception("Falha inesperada ao importar NF-e por chave %s", chave)
                return Response(
                    {
                        "detail": (
                            "Erro interno ao consultar a SEFAZ por chave. "
                            "Verifique os logs do servidor."
                        )
                    },
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )

        contagem = {
            "importadas": 0,
            "duplicadas": 0,
            "resumos": 0,
            "nao_encontradas": 0,
            "erros": 0,
        }
        chave_status = {
            "importada": "importadas",
            "duplicada": "duplicadas",
            "resumo": "resumos",
            "nao_encontrada": "nao_encontradas",
            "erro": "erros",
        }
        for item in resultados:
            contagem[chave_status[item.status]] += 1

        payload = {
            "sucesso": all(item.sucesso for item in resultados),
            "total": len(resultados),
            **contagem,
            "resultados": [
                {
                    "chave": item.chave,
                    "sucesso": item.sucesso,
                    "status": item.status,
                    "mensagem": item.mensagem,
                    "documento_id": item.documento_id,
                    "cstat": item.cstat,
                    "motivo": item.motivo,
                }
                for item in resultados
            ],
        }
        return Response(payload, status=status.HTTP_200_OK)
