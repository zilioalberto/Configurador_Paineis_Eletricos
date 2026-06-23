"""Configuração SEFAZ lida do Django settings."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from django.conf import settings


@dataclass(frozen=True)
class SefazConfig:
    cnpj: str
    uf: str
    ambiente: str  # 1=produção, 2=homologação
    cert_path: Path
    cert_password: str
    provider: str  # native | stub
    max_ciclos_nsu: int = 20
    auto_ciencia: bool = False

    def validate(self) -> None:
        if len(self.cnpj) != 14 or not self.cnpj.isdigit():
            raise ValueError("CNPJ da empresa deve conter 14 dígitos (FISCAL_EMPRESA_CNPJ).")
        if self.uf and (len(self.uf) != 2 or not self.uf.isdigit()):
            raise ValueError("UF SEFAZ inválida (FISCAL_SEFAZ_UF — código IBGE, ex.: 35).")
        if self.ambiente not in {"1", "2"}:
            raise ValueError("FISCAL_SEFAZ_AMBIENTE deve ser 1 (produção) ou 2 (homologação).")
        if self.provider in {"native", "a1"}:
            if not self.cert_path.is_file():
                raise FileNotFoundError(f"Certificado A1 não encontrado: {self.cert_path}")
            if not self.cert_password:
                raise ValueError("FISCAL_CERT_PASSWORD não configurada.")


def get_sefaz_config() -> SefazConfig:
    cnpj = "".join(ch for ch in (getattr(settings, "FISCAL_EMPRESA_CNPJ", "") or "") if ch.isdigit())
    uf = "".join(ch for ch in (getattr(settings, "FISCAL_SEFAZ_UF", "") or "") if ch.isdigit())
    ambiente = str(getattr(settings, "FISCAL_SEFAZ_AMBIENTE", "2") or "2").strip()
    cert_path = Path(getattr(settings, "FISCAL_CERT_PATH", "") or "")
    cert_password = getattr(settings, "FISCAL_CERT_PASSWORD", "") or ""
    provider = (getattr(settings, "FISCAL_SEFAZ_PROVIDER", "native") or "native").strip().lower()
    max_ciclos = int(getattr(settings, "FISCAL_SYNC_MAX_CICLOS", 20) or 20)
    auto_ciencia = bool(getattr(settings, "FISCAL_AUTO_CIENCIA", False))
    return SefazConfig(
        cnpj=cnpj,
        uf=uf or "35",
        ambiente=ambiente,
        cert_path=cert_path,
        cert_password=cert_password,
        provider=provider,
        max_ciclos_nsu=max(1, max_ciclos),
        auto_ciencia=auto_ciencia,
    )
