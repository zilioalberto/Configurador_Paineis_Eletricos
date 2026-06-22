"""Cliente HTTP mTLS para API ADN (contribuintes)."""
from __future__ import annotations

import tempfile
from pathlib import Path
from urllib.parse import urlencode

import requests

from apps.fiscal.services.sefaz.certificado import CertificadoA1

from .config import NfseAdnConfig


def get_json_adn(
    *,
    config: NfseAdnConfig,
    path: str,
    params: dict[str, str] | None = None,
    certificado: CertificadoA1 | None = None,
    timeout_sec: int = 120,
) -> tuple[int, dict | list | str]:
    cert = certificado or CertificadoA1.carregar(config.cert_path, config.cert_password)
    cert_pem, key_pem = cert.material_pem()
    query = f"?{urlencode(params)}" if params else ""
    url = f"{config.base_url.rstrip('/')}{path}{query}"

    with tempfile.TemporaryDirectory() as tmp:
        cert_file = Path(tmp) / "cert.pem"
        key_file = Path(tmp) / "key.pem"
        cert_file.write_bytes(cert_pem)
        key_file.write_bytes(key_pem)
        response = requests.get(
            url,
            headers={"Accept": "application/json"},
            cert=(str(cert_file), str(key_file)),
            timeout=timeout_sec,
        )
        try:
            body = response.json()
        except ValueError:
            body = response.text
        return response.status_code, body
