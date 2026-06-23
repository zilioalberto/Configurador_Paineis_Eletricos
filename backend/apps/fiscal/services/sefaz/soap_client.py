"""Cliente SOAP 1.2 com mTLS (certificado A1)."""
from __future__ import annotations

import tempfile
from pathlib import Path

import requests
from requests import HTTPError

from .certificado import CertificadoA1


def post_soap(
    *,
    url: str,
    soap_action: str,
    envelope: str,
    certificado: CertificadoA1,
    timeout_sec: int = 120,
) -> str:
    cert_pem, key_pem = certificado.material_pem()
    with tempfile.TemporaryDirectory() as tmp:
        cert_file = Path(tmp) / "cert.pem"
        key_file = Path(tmp) / "key.pem"
        cert_file.write_bytes(cert_pem)
        key_file.write_bytes(key_pem)

        headers = {
            "Content-Type": 'application/soap+xml; charset=utf-8; action="{}"'.format(soap_action),
        }
        response = requests.post(
            url,
            data=envelope.encode("utf-8"),
            headers=headers,
            cert=(str(cert_file), str(key_file)),
            timeout=timeout_sec,
        )
        try:
            response.raise_for_status()
        except HTTPError as exc:
            detalhe = (response.text or "").strip().replace("\n", " ")[:1000]
            mensagem = f"{exc}. Resposta SEFAZ: {detalhe}" if detalhe else str(exc)
            raise HTTPError(mensagem, response=response) from exc
        return response.text
