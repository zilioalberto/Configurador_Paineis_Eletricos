"""Status operacional da sincronização ADN NFS-e para o portal."""
from __future__ import annotations

from dataclasses import dataclass

from django.conf import settings

from .config import get_nfse_adn_config


@dataclass(frozen=True)
class NfseAdnSyncStatus:
    provider: str
    certificado_a1_configurado: bool
    nfse_adn_sync_disponivel: bool
    nfse_adn_sync_modo: str
    nfse_adn_sync_mensagem: str

    def as_api_dict(self) -> dict[str, object]:
        return {
            "nfse_adn_provider": self.provider,
            "certificado_a1_configurado": self.certificado_a1_configurado,
            "nfse_adn_sync_disponivel": self.nfse_adn_sync_disponivel,
            "nfse_adn_sync_modo": self.nfse_adn_sync_modo,
            "nfse_adn_sync_mensagem": self.nfse_adn_sync_mensagem,
        }


def montar_status_nfse_adn_sync() -> NfseAdnSyncStatus:
    config = get_nfse_adn_config()
    cert_ok = (
        config.provider in {"native", "a1"}
        and bool(str(config.cert_path).strip())
        and config.cert_path.is_file()
        and bool((config.cert_password or "").strip())
    )

    if cert_ok:
        ambiente = "produção" if config.ambiente == "1" else "homologação"
        return NfseAdnSyncStatus(
            provider=config.provider,
            certificado_a1_configurado=True,
            nfse_adn_sync_disponivel=True,
            nfse_adn_sync_modo="producao",
            nfse_adn_sync_mensagem=(
                f"Sincronização ADN NFS-e disponível (ambiente {ambiente}). "
                "Consulta NFS-es de serviço emitidas contra o CNPJ da empresa."
            ),
        )

    if config.provider in {"stub", "homolog"}:
        return NfseAdnSyncStatus(
            provider=config.provider,
            certificado_a1_configurado=False,
            nfse_adn_sync_disponivel=False,
            nfse_adn_sync_modo="stub",
            nfse_adn_sync_mensagem=(
                "Modo simulado (FISCAL_NFSE_ADN_PROVIDER=stub). "
                "Não consulta o ADN real. Configure certificado A1 e provider=native."
            ),
        )

    if not str(config.cert_path).strip():
        mensagem = "Certificado A1 não configurado (FISCAL_CERT_PATH / FISCAL_CERT_PASSWORD)."
    elif not config.cert_path.is_file():
        mensagem = f"Certificado A1 não encontrado: {config.cert_path}"
    elif not (config.cert_password or "").strip():
        mensagem = "Senha do certificado A1 não configurada."
    else:
        mensagem = "Sincronização ADN indisponível. Verifique certificado e FISCAL_NFSE_ADN_PROVIDER=native."

    return NfseAdnSyncStatus(
        provider=config.provider,
        certificado_a1_configurado=False,
        nfse_adn_sync_disponivel=False,
        nfse_adn_sync_modo="indisponivel",
        nfse_adn_sync_mensagem=mensagem,
    )
