"""Configuração da ponte via variáveis de ambiente."""
from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

_PONTE_ROOT = Path(__file__).resolve().parent.parent


def load_env_file() -> Path | None:
    """Carrega tools/fiscal_ponte/.env (não sobrescreve variáveis já definidas)."""
    try:
        from dotenv import load_dotenv
    except ImportError:
        return None
    env_path = _PONTE_ROOT / ".env"
    if env_path.is_file():
        load_dotenv(env_path, override=False)
        return env_path
    return None


def _env(name: str, default: str = "") -> str:
    return (os.getenv(name, default) or "").strip()


def _env_int(name: str, default: int) -> int:
    raw = _env(name, str(default))
    try:
        return int(raw)
    except ValueError:
        return default


def _env_float(name: str, default: float) -> float:
    raw = _env(name, str(default))
    try:
        return float(raw)
    except ValueError:
        return default


@dataclass(frozen=True)
class PonteConfig:
    api_base_url: str
    agent_token: str
    cnpj: str
    uf: str
    sefaz_provider: str
    acbr_host: str
    acbr_port: int
    acbr_timeout_sec: int
    acbr_output_dir: Path | None
    folder_xml: Path | None
    max_ciclos_nsu: int
    api_retry_max: int
    api_retry_base_sec: float
    sync_interval_min: int

    @classmethod
    def from_env(cls, *, load_dotenv_file: bool = True) -> PonteConfig:
        if load_dotenv_file:
            load_env_file()
        base = _env("FISCAL_PONTE_API_BASE_URL", "http://localhost:8000/api/v1").rstrip("/")
        cnpj = "".join(ch for ch in _env("FISCAL_PONTE_CNPJ") if ch.isdigit())
        provider = _env("FISCAL_PONTE_SEFAZ_PROVIDER", "stub").lower()
        out_dir = _env("FISCAL_PONTE_ACBR_OUTPUT_DIR")
        folder = _env("FISCAL_PONTE_FOLDER_XML")
        return cls(
            api_base_url=base,
            agent_token=_env("FISCAL_PONTE_AGENT_TOKEN"),
            cnpj=cnpj,
            uf=_env("FISCAL_PONTE_UF", "35"),
            sefaz_provider=provider,
            acbr_host=_env("FISCAL_PONTE_ACBR_HOST", "127.0.0.1"),
            acbr_port=_env_int("FISCAL_PONTE_ACBR_PORT", 3434),
            acbr_timeout_sec=_env_int("FISCAL_PONTE_ACBR_TIMEOUT_SEC", 120),
            acbr_output_dir=Path(out_dir) if out_dir else None,
            folder_xml=Path(folder) if folder else None,
            max_ciclos_nsu=_env_int("FISCAL_PONTE_MAX_CICLOS_NSU", 20),
            api_retry_max=_env_int("FISCAL_PONTE_API_RETRY_MAX", 3),
            api_retry_base_sec=_env_float("FISCAL_PONTE_API_RETRY_BASE_SEC", 2.0),
            sync_interval_min=_env_int("FISCAL_PONTE_SYNC_INTERVAL_MIN", 15),
        )

    def validate(self) -> None:
        if not self.agent_token:
            raise ValueError("FISCAL_PONTE_AGENT_TOKEN é obrigatório.")
        if len(self.cnpj) != 14:
            raise ValueError("FISCAL_PONTE_CNPJ deve ter 14 dígitos.")
        if not self.uf.isdigit() or len(self.uf) != 2:
            raise ValueError("FISCAL_PONTE_UF deve ser o código IBGE com 2 dígitos (ex.: 35).")
        if self.sefaz_provider == "acbr" and not self.acbr_output_dir:
            raise ValueError(
                "FISCAL_PONTE_ACBR_OUTPUT_DIR é obrigatório quando SEFAZ_PROVIDER=acbr."
            )
        if self.sefaz_provider == "folder" and not self.folder_xml:
            raise ValueError("FISCAL_PONTE_FOLDER_XML é obrigatório quando SEFAZ_PROVIDER=folder.")
