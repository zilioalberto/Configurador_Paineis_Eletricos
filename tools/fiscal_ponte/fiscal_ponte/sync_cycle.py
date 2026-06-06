"""Orquestração: NSU no servidor → SEFAZ local → importação → PATCH NSU."""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone

from .api_client import FiscalApiClient
from .config import PonteConfig
from .manifestacao_worker import processar_manifestacoes_pendentes
from .sefaz import build_sefaz_provider
from .sefaz.acbr_response import normalizar_nsu

logger = logging.getLogger(__name__)

# Consumo indevido (SEFAZ) — bloqueio sugerido de 1 hora
_CSTAT_BLOQUEIO = {"656"}


@dataclass
class SyncCycleResult:
    sucesso: bool
    mensagem: str
    ciclos_executados: int = 0
    documentos_enviados: int = 0
    documentos_novos: int = 0
    documentos_duplicados: int = 0
    erros_importacao: list[str] = field(default_factory=list)
    ultimo_cstat: str = ""
    ultimo_nsu: str = ""
    max_nsu: str = ""

    def resumo_log(self) -> str:
        return (
            f"{self.mensagem} | ciclos={self.ciclos_executados} "
            f"enviados={self.documentos_enviados} novos={self.documentos_novos} "
            f"dup={self.documentos_duplicados} cStat={self.ultimo_cstat} "
            f"ultNSU={self.ultimo_nsu} maxNSU={self.max_nsu}"
        )


def _agora_utc() -> datetime:
    return datetime.now(timezone.utc)


def _iso(dt: datetime) -> str:
    return dt.isoformat()


def executar_ciclo_sincronizacao(
    config: PonteConfig,
    *,
    dry_run: bool = False,
) -> SyncCycleResult:
    """
    Fluxo documentado em docs/modulos/fiscal.md (ponte A3).
    """
    config.validate()
    api = FiscalApiClient(
        config.api_base_url,
        config.agent_token,
        retry_max=config.api_retry_max,
        retry_base_sec=config.api_retry_base_sec,
    )
    sefaz = build_sefaz_provider(config)

    controle = api.get_controle_nsu(config.cnpj)
    if controle.bloqueado_ate and controle.bloqueado_ate > _agora_utc():
        return SyncCycleResult(
            sucesso=False,
            mensagem=f"Consulta bloqueada até {controle.bloqueado_ate.isoformat()}",
            ultimo_nsu=controle.ultimo_nsu,
            max_nsu=controle.max_nsu or controle.ultimo_nsu,
        )

    ultimo_nsu = normalizar_nsu(controle.ultimo_nsu)
    max_nsu = normalizar_nsu(controle.max_nsu or ultimo_nsu)

    resultado = SyncCycleResult(
        sucesso=True,
        mensagem="Sincronização concluída",
        ultimo_nsu=ultimo_nsu,
        max_nsu=max_nsu,
    )

    ciclos = 0
    while ciclos < config.max_ciclos_nsu:
        ciclos += 1
        resultado.ciclos_executados = ciclos
        logger.info("Ciclo %s — consulta SEFAZ ultNSU=%s", ciclos, ultimo_nsu)

        if dry_run:
            logger.info("dry-run: não consulta SEFAZ nem grava no servidor")
            resultado.mensagem = "dry-run (sem consulta SEFAZ)"
            return resultado

        dist = sefaz.distribuicao_por_ult_nsu(
            cnpj=config.cnpj,
            uf=config.uf,
            ultimo_nsu=ultimo_nsu,
        )
        resultado.ultimo_cstat = dist.cstat
        resultado.ultimo_nsu = dist.ultimo_nsu
        resultado.max_nsu = dist.max_nsu

        bloqueado_ate: datetime | None = None
        if dist.cstat in _CSTAT_BLOQUEIO:
            bloqueado_ate = _agora_utc() + timedelta(hours=1)

        for doc in dist.documentos:
            resultado.documentos_enviados += 1
            try:
                imp = api.importar_xml(doc.xml, nsu=doc.nsu, origem_importacao="PONTE_A3")
                if imp.created:
                    resultado.documentos_novos += 1
                else:
                    resultado.documentos_duplicados += 1
                logger.info(
                    "Importado chave=%s created=%s",
                    imp.chave_acesso,
                    imp.created,
                )
            except Exception as exc:  # noqa: BLE001 — log e continua próximo XML
                msg = f"{doc.nome_arquivo or 'xml'}: {exc}"
                resultado.erros_importacao.append(msg)
                logger.error("Falha ao importar: %s", msg)

        ultimo_nsu = dist.ultimo_nsu
        max_nsu = dist.max_nsu

        api.patch_controle_nsu(
            config.cnpj,
            {
                "ultimo_nsu": ultimo_nsu,
                "max_nsu": max_nsu,
                "ultimo_cstat": dist.cstat,
                "ultimo_motivo": dist.xmotivo[:255],
                "ultima_consulta": _iso(_agora_utc()),
                **({"bloqueado_ate": _iso(bloqueado_ate)} if bloqueado_ate else {}),
            },
        )

        # 137 = sem documentos; 138 = há documentos — continuar até alcançar maxNSU
        if dist.cstat == "137" or ultimo_nsu >= max_nsu:
            break

    resultado.ultimo_nsu = ultimo_nsu
    resultado.max_nsu = max_nsu
    if resultado.erros_importacao:
        resultado.sucesso = False
        resultado.mensagem = "Sincronização com erros de importação"

    if not dry_run:
        try:
            man = processar_manifestacoes_pendentes(config)
            if man.processadas:
                logger.info(
                    "Manifestações: processadas=%s sucesso=%s erros=%s",
                    man.processadas,
                    man.sucesso,
                    man.erros,
                )
        except Exception:
            logger.exception("Falha ao processar manifestações pendentes")

    return resultado
