"""Factory do provedor SEFAZ conforme configuração."""
from __future__ import annotations

from ..config import PonteConfig
from .acbr_monitor import AcbrMonitorProvider
from .base import SefazProvider
from .folder import FolderXmlProvider
from .stub import StubSefazProvider


def build_sefaz_provider(config: PonteConfig) -> SefazProvider:
    provider = config.sefaz_provider
    if provider == "stub":
        return StubSefazProvider()
    if provider == "folder":
        assert config.folder_xml is not None
        return FolderXmlProvider(config.folder_xml)
    if provider == "acbr":
        assert config.acbr_output_dir is not None
        return AcbrMonitorProvider(
            host=config.acbr_host,
            port=config.acbr_port,
            timeout_sec=config.acbr_timeout_sec,
            output_dir=config.acbr_output_dir,
        )
    raise ValueError(
        f"FISCAL_PONTE_SEFAZ_PROVIDER inválido: {provider!r}. Use stub, acbr ou folder."
    )
