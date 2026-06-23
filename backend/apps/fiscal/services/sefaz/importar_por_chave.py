"""Importação retroativa de NF-e recebida pela chave de acesso (consChNFe).

Diferente da sincronização por NSU (incremental), a consulta por chave é pontual:
não avança o cursor NSU e não dispara cStat 656. Serve para recuperar notas
antigas cujas chaves de 44 dígitos sejam conhecidas.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass

from apps.fiscal.choices import OrigemImportacaoFiscalChoices
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe

from .certificado import CertificadoA1
from .config import SefazConfig, get_sefaz_config
from .distribuicao_dfe import consultar_distribuicao_por_chave
from .documentos_distribuidos import (
    salvar_resumo_nfe_distribuido,
    vincular_xml_completo_distribuido,
)

logger = logging.getLogger(__name__)


@dataclass
class ImportarPorChaveResultado:
    chave: str
    sucesso: bool
    status: str  # importada | duplicada | resumo | nao_encontrada | erro
    mensagem: str
    documento_id: int | None = None
    cstat: str = ""
    motivo: str = ""


def _normalizar_chave(chave: str) -> str:
    return "".join(ch for ch in (chave or "") if ch.isdigit())[:44]


def importar_nfe_por_chave(
    chave: str,
    *,
    config: SefazConfig | None = None,
    certificado: CertificadoA1 | None = None,
) -> ImportarPorChaveResultado:
    chave_norm = _normalizar_chave(chave)
    if len(chave_norm) != 44:
        return ImportarPorChaveResultado(
            chave=chave_norm or (chave or "").strip(),
            sucesso=False,
            status="erro",
            mensagem="Chave de acesso inválida (são esperados 44 dígitos).",
        )

    config = config or get_sefaz_config()

    try:
        dist = consultar_distribuicao_por_chave(
            config=config,
            chave=chave_norm,
            certificado=certificado,
        )
    except Exception as exc:  # noqa: BLE001 - reportar falha de comunicação ao chamador
        logger.exception("Falha ao consultar DistDFe por chave %s", chave_norm)
        return ImportarPorChaveResultado(
            chave=chave_norm,
            sucesso=False,
            status="erro",
            mensagem=f"Falha na comunicação com a SEFAZ: {exc}",
        )

    if dist.documentos:
        doc = dist.documentos[0]
        try:
            imp = importar_xml_nfe(
                xml=doc.xml,
                nsu=doc.nsu,
                cnpj_destinatario=config.cnpj,
                origem_importacao=OrigemImportacaoFiscalChoices.SEFAZ_SYNC,
            )
        except Exception as exc:  # noqa: BLE001
            logger.exception("Falha ao importar NF-e por chave %s", chave_norm)
            return ImportarPorChaveResultado(
                chave=chave_norm,
                sucesso=False,
                status="erro",
                mensagem=f"Documento localizado, mas falhou ao importar: {exc}",
                cstat=dist.cstat,
                motivo=dist.xmotivo,
            )
        vincular_xml_completo_distribuido(
            documento_recebido=imp["documento"],
            xml=doc.xml,
            nsu=doc.nsu,
            schema=doc.schema,
        )
        criada = bool(imp["created"])
        return ImportarPorChaveResultado(
            chave=chave_norm,
            sucesso=True,
            status="importada" if criada else "duplicada",
            mensagem=(
                "NF-e importada da SEFAZ."
                if criada
                else "NF-e já estava importada (atualizada)."
            ),
            documento_id=imp["documento"].id,
            cstat=dist.cstat,
            motivo=dist.xmotivo,
        )

    if dist.resumos_nfe:
        resumo = dist.resumos_nfe[0]
        salvar_resumo_nfe_distribuido(resumo, cnpj_destinatario=config.cnpj)
        return ImportarPorChaveResultado(
            chave=chave_norm,
            sucesso=True,
            status="resumo",
            mensagem=(
                "A SEFAZ retornou apenas o resumo. Manifeste a Ciência da Operação "
                "para liberar o XML completo (a auto-ciência fará isso na próxima sincronização)."
            ),
            cstat=dist.cstat,
            motivo=dist.xmotivo,
        )

    return ImportarPorChaveResultado(
        chave=chave_norm,
        sucesso=False,
        status="nao_encontrada",
        mensagem=dist.xmotivo or "Nenhum documento localizado para esta chave.",
        cstat=dist.cstat,
        motivo=dist.xmotivo,
    )
