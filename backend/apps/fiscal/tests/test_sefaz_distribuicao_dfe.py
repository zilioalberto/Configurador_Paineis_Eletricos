from pathlib import Path

import pytest

from apps.fiscal.services.sefaz import distribuicao_dfe as dd
from apps.fiscal.services.sefaz.config import SefazConfig
from apps.fiscal.services.sefaz.parse_dist_dfe import DistDfeResultado

SOAP_SEM_DOCS = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeDistDFeInteresseResponse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDistDFeInteresseResult>
        <retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>2</tpAmb>
          <cStat>137</cStat>
          <xMotivo>Nenhum documento localizado</xMotivo>
          <ultNSU>000000000000010</ultNSU>
          <maxNSU>000000000000010</maxNSU>
        </retDistDFeInt>
      </nfeDistDFeInteresseResult>
    </nfeDistDFeInteresseResponse>
  </soap:Body>
</soap:Envelope>"""


def _config(provider: str = "native") -> SefazConfig:
    return SefazConfig(
        cnpj="07284171000139",
        uf="35",
        ambiente="2",
        cert_path=Path("inexistente.pfx"),
        cert_password="x",
        provider=provider,
    )


def test_montar_dist_dfe_int_por_nsu():
    xml = dd._montar_dist_dfe_int(config=_config(), ultimo_nsu="000000000000005")
    assert "<distNSU><ultNSU>000000000000005</ultNSU></distNSU>" in xml
    assert "<CNPJ>07284171000139</CNPJ>" in xml
    assert "<tpAmb>2</tpAmb>" in xml


def test_montar_dist_dfe_int_por_chave():
    xml = dd._montar_dist_dfe_int_chave(config=_config(), chave="4" * 44)
    assert f"<consChNFe><chNFe>{'4' * 44}</chNFe></consChNFe>" in xml


def test_consultar_por_nsu_stub_retorna_resultado_vazio():
    resultado = dd.consultar_distribuicao_por_nsu(
        config=_config(provider="stub"),
        ultimo_nsu="000000000000003",
    )
    assert isinstance(resultado, DistDfeResultado)
    assert resultado.cstat == "137"
    assert resultado.documentos == []


def test_consultar_por_nsu_native_chama_post_soap(monkeypatch):
    monkeypatch.setattr(SefazConfig, "validate", lambda self: None)
    chamadas = {}

    def fake_post(*, url, soap_action, envelope, certificado):
        chamadas["url"] = url
        chamadas["envelope"] = envelope
        return SOAP_SEM_DOCS

    monkeypatch.setattr(dd, "post_soap", fake_post)
    resultado = dd.consultar_distribuicao_por_nsu(
        config=_config(provider="native"),
        ultimo_nsu="000000000000009",
        certificado=object(),
    )
    assert resultado.cstat == "137"
    assert "distNSU" in chamadas["envelope"]


def test_consultar_por_chave_invalida_levanta_erro():
    with pytest.raises(ValueError):
        dd.consultar_distribuicao_por_chave(config=_config(), chave="123")


def test_consultar_por_chave_stub_retorna_137():
    resultado = dd.consultar_distribuicao_por_chave(
        config=_config(provider="stub"),
        chave="1" * 44,
    )
    assert resultado.cstat == "137"
    assert "simulado" in resultado.xmotivo.lower()


def test_consultar_por_chave_native_chama_post_soap(monkeypatch):
    monkeypatch.setattr(SefazConfig, "validate", lambda self: None)
    chamadas = {}

    def fake_post(*, url, soap_action, envelope, certificado):
        chamadas["envelope"] = envelope
        return SOAP_SEM_DOCS

    monkeypatch.setattr(dd, "post_soap", fake_post)
    resultado = dd.consultar_distribuicao_por_chave(
        config=_config(provider="native"),
        chave="1234.5678/9012-" + "3" * 32,
        certificado=object(),
    )
    assert resultado.cstat == "137"
    assert "consChNFe" in chamadas["envelope"]
