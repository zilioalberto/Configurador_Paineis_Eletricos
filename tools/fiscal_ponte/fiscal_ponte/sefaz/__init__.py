"""Adaptadores de consulta SEFAZ (certificado local)."""

from .base import DistDfeDocumento, DistDfeResultado, SefazProvider
from .factory import build_sefaz_provider

__all__ = [
    "DistDfeDocumento",
    "DistDfeResultado",
    "SefazProvider",
    "build_sefaz_provider",
]
