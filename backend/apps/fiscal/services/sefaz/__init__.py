"""Integração nativa com webservices SEFAZ (certificado A1)."""

from .config import SefazConfig, get_sefaz_config
from .distribuicao_dfe import consultar_distribuicao_por_nsu
from .parse_dist_dfe import DistDfeDocumento, DistDfeResultado
from .nsu_sync import SyncNsuResult, executar_sincronizacao_nsu

__all__ = [
    "SefazConfig",
    "get_sefaz_config",
    "DistDfeDocumento",
    "DistDfeResultado",
    "consultar_distribuicao_por_nsu",
    "SyncNsuResult",
    "executar_sincronizacao_nsu",
]
