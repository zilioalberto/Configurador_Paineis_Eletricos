"""Status operacional da sincronização SEFAZ para portal e API."""
from __future__ import annotations

from dataclasses import dataclass

from .config import SefazConfig, get_sefaz_config


@dataclass(frozen=True)
class SefazSyncStatus:
    provider: str
    certificado_a1_configurado: bool
    sefaz_sync_disponivel: bool
    sefaz_sync_modo: str
    sefaz_sync_mensagem: str

    def as_api_dict(self) -> dict[str, object]:
        return {
            "sefaz_provider": self.provider,
            "certificado_a1_configurado": self.certificado_a1_configurado,
            "sefaz_sync_disponivel": self.sefaz_sync_disponivel,
            "sefaz_sync_modo": self.sefaz_sync_modo,
            "sefaz_sync_mensagem": self.sefaz_sync_mensagem,
            # Compatibilidade com clientes antigos: só true quando sync real está disponível.
            "sefaz_sync_configurado": self.sefaz_sync_disponivel,
        }


def certificado_a1_configurado(config: SefazConfig) -> bool:
    return (
        config.provider in {"native", "a1"}
        and bool(str(config.cert_path).strip())
        and config.cert_path.is_file()
        and bool((config.cert_password or "").strip())
    )


def montar_status_sefaz_sync() -> SefazSyncStatus:
    config = get_sefaz_config()
    cert_ok = certificado_a1_configurado(config)

    if cert_ok:
        return SefazSyncStatus(
            provider=config.provider,
            certificado_a1_configurado=True,
            sefaz_sync_disponivel=True,
            sefaz_sync_modo="producao",
            sefaz_sync_mensagem=(
                "Certificado A1 configurado. A sincronização consulta a SEFAZ "
                "com o certificado da empresa."
            ),
        )

    if config.provider in {"stub", "homolog"}:
        return SefazSyncStatus(
            provider=config.provider,
            certificado_a1_configurado=False,
            sefaz_sync_disponivel=False,
            sefaz_sync_modo="stub",
            sefaz_sync_mensagem=(
                "Modo simulado (FISCAL_SEFAZ_PROVIDER=stub). "
                "Não consulta a SEFAZ real nem importa NF-es. "
                "Configure FISCAL_CERT_PATH, FISCAL_CERT_PASSWORD e "
                "FISCAL_SEFAZ_PROVIDER=native no servidor."
            ),
        )

    cert_path_str = str(config.cert_path).strip()
    if not cert_path_str:
        mensagem = (
            "Certificado A1 não configurado. Defina FISCAL_CERT_PATH e "
            "FISCAL_CERT_PASSWORD no servidor."
        )
    elif not config.cert_path.is_file():
        mensagem = f"Certificado A1 não encontrado: {config.cert_path}"
    elif not (config.cert_password or "").strip():
        mensagem = "Senha do certificado A1 não configurada (FISCAL_CERT_PASSWORD)."
    else:
        mensagem = (
            "Sincronização com a SEFAZ indisponível. Verifique o certificado A1 "
            "e FISCAL_SEFAZ_PROVIDER=native."
        )

    return SefazSyncStatus(
        provider=config.provider,
        certificado_a1_configurado=False,
        sefaz_sync_disponivel=False,
        sefaz_sync_modo="indisponivel",
        sefaz_sync_mensagem=mensagem,
    )
