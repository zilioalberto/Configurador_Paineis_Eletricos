from pathlib import Path

from apps.fiscal.services.nfse_adn import client as adn_client
from apps.fiscal.services.nfse_adn.config import NfseAdnConfig


class _FakeCert:
    def material_pem(self):
        return b"-----CERT-----", b"-----KEY-----"


class _FakeResponse:
    def __init__(self, status_code, *, json_data=None, text="", raise_json=False):
        self.status_code = status_code
        self._json_data = json_data
        self.text = text
        self._raise_json = raise_json

    def json(self):
        if self._raise_json:
            raise ValueError("not json")
        return self._json_data


def _config() -> NfseAdnConfig:
    return NfseAdnConfig(
        cnpj="07284171000139",
        ambiente="1",
        cert_path=Path("inexistente.pfx"),
        cert_password="x",
        provider="native",
    )


def test_get_json_adn_retorna_json(monkeypatch):
    capturado = {}

    def fake_get(url, *, headers, cert, timeout):
        capturado["url"] = url
        capturado["headers"] = headers
        capturado["cert"] = cert
        capturado["timeout"] = timeout
        return _FakeResponse(200, json_data={"StatusProcessamento": "OK"})

    monkeypatch.setattr(adn_client.requests, "get", fake_get)
    status, body = adn_client.get_json_adn(
        config=_config(),
        path="/contribuinte/dfe/123",
        certificado=_FakeCert(),
    )
    assert status == 200
    assert body == {"StatusProcessamento": "OK"}
    assert capturado["url"] == "https://adn.nfse.gov.br/contribuinte/dfe/123"
    assert capturado["headers"]["Accept"] == "application/json"
    assert isinstance(capturado["cert"], tuple)
    assert capturado["timeout"] == 120


def test_get_json_adn_monta_querystring(monkeypatch):
    capturado = {}

    def fake_get(url, *, headers, cert, timeout):
        capturado["url"] = url
        return _FakeResponse(200, json_data=[])

    monkeypatch.setattr(adn_client.requests, "get", fake_get)
    adn_client.get_json_adn(
        config=_config(),
        path="/contribuinte/dfe",
        params={"nsu": "10", "tipo": "NFSE"},
        certificado=_FakeCert(),
    )
    assert capturado["url"].startswith("https://adn.nfse.gov.br/contribuinte/dfe?")
    assert "nsu=10" in capturado["url"]
    assert "tipo=NFSE" in capturado["url"]


def test_get_json_adn_fallback_texto_quando_nao_json(monkeypatch):
    def fake_get(url, *, headers, cert, timeout):
        return _FakeResponse(500, text="erro interno", raise_json=True)

    monkeypatch.setattr(adn_client.requests, "get", fake_get)
    status, body = adn_client.get_json_adn(
        config=_config(),
        path="/contribuinte/dfe",
        certificado=_FakeCert(),
        timeout_sec=30,
    )
    assert status == 500
    assert body == "erro interno"
