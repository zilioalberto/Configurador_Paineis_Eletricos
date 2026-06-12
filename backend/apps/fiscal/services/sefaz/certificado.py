"""Carregamento de certificado A1 (.pfx) para mTLS e assinatura XML."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.serialization import Encoding, NoEncryption, PrivateFormat, pkcs12


@dataclass
class CertificadoA1:
    key_pem: bytes
    cert_pem: bytes
    ca_pems: list[bytes]

    @classmethod
    def carregar(cls, caminho: Path, senha: str) -> CertificadoA1:
        dados = caminho.read_bytes()
        senha_bytes = senha.encode("utf-8") if senha else None
        key, cert, extras = pkcs12.load_key_and_certificates(dados, senha_bytes)
        if key is None or cert is None:
            raise ValueError("Arquivo PFX não contém chave privada e certificado.")

        key_pem = key.private_bytes(Encoding.PEM, PrivateFormat.PKCS8, NoEncryption())
        cert_pem = cert.public_bytes(Encoding.PEM)
        ca_pems = [c.public_bytes(Encoding.PEM) for c in (extras or [])]
        return cls(key_pem=key_pem, cert_pem=cert_pem, ca_pems=ca_pems)

    def material_pem(self) -> tuple[bytes, bytes]:
        """Tupla (cert_pem, key_pem) para requests."""
        return self.cert_pem, self.key_pem
