import base64
import gzip
from pathlib import Path

import pytest
from django.test import override_settings

from apps.fiscal.choices import OrigemImportacaoFiscalChoices
from apps.fiscal.models import DocumentoFiscalRecebido
from apps.fiscal.services.sefaz.config import get_sefaz_config
from apps.fiscal.services.sefaz.importar_por_chave import importar_nfe_por_chave
from apps.fiscal.services.sefaz.parse_dist_dfe import (
    DistDfeResultado,
    parse_resposta_distribuicao_dfe,
)
from core.choices.usuarios import TipoUsuarioChoices

SAMPLE_NFE = Path(__file__).resolve().parent / "fixtures_sample_nfe_homolog.xml"

CHAVE_VALIDA = "35200114200166000187550010000000211000000017"
IMPORT_CHAVE_URL = "/api/v1/fiscal/nfes/importar-por-chave/"


def _soap_com_nfe(xml_nfe: str, *, cstat: str = "138") -> str:
    compactado = base64.b64encode(gzip.compress(xml_nfe.encode("utf-8"))).decode("ascii")
    return f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeDistDFeInteresseResponse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDistDFeInteresseResult>
        <retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>2</tpAmb>
          <cStat>{cstat}</cStat>
          <xMotivo>Documento localizado</xMotivo>
          <ultNSU>000000000000000</ultNSU>
          <maxNSU>000000000000000</maxNSU>
          <loteDistDFeInt>
            <docZip NSU="000000000000010" schema="procNFe_v4.00.xsd">{compactado}</docZip>
          </loteDistDFeInt>
        </retDistDFeInt>
      </nfeDistDFeInteresseResult>
    </nfeDistDFeInteresseResponse>
  </soap:Body>
</soap:Envelope>"""


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ="98765432000188", FISCAL_SEFAZ_PROVIDER="stub")
def test_importar_por_chave_importa_documento(monkeypatch):
    xml_nfe = SAMPLE_NFE.read_text(encoding="utf-8")
    soap = _soap_com_nfe(xml_nfe)

    def fake_consulta(*, config, chave, certificado=None):
        return parse_resposta_distribuicao_dfe(soap, ultimo_nsu_consulta="0")

    monkeypatch.setattr(
        "apps.fiscal.services.sefaz.importar_por_chave.consultar_distribuicao_por_chave",
        fake_consulta,
    )

    resultado = importar_nfe_por_chave(CHAVE_VALIDA, config=get_sefaz_config())

    assert resultado.sucesso is True
    assert resultado.status == "importada"
    assert resultado.documento_id is not None
    doc = DocumentoFiscalRecebido.objects.get()
    assert doc.origem_importacao == OrigemImportacaoFiscalChoices.SEFAZ_SYNC


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ="98765432000188", FISCAL_SEFAZ_PROVIDER="stub")
def test_importar_por_chave_duplicada(monkeypatch):
    xml_nfe = SAMPLE_NFE.read_text(encoding="utf-8")
    soap = _soap_com_nfe(xml_nfe)

    def fake_consulta(*, config, chave, certificado=None):
        return parse_resposta_distribuicao_dfe(soap, ultimo_nsu_consulta="0")

    monkeypatch.setattr(
        "apps.fiscal.services.sefaz.importar_por_chave.consultar_distribuicao_por_chave",
        fake_consulta,
    )

    config = get_sefaz_config()
    importar_nfe_por_chave(CHAVE_VALIDA, config=config)
    segunda = importar_nfe_por_chave(CHAVE_VALIDA, config=config)

    assert segunda.status == "duplicada"
    assert DocumentoFiscalRecebido.objects.count() == 1


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ="98765432000188", FISCAL_SEFAZ_PROVIDER="stub")
def test_importar_por_chave_nao_encontrada(monkeypatch):
    def fake_consulta(*, config, chave, certificado=None):
        return DistDfeResultado(
            cstat="137",
            xmotivo="Nenhum documento localizado",
            ultimo_nsu="000000000000000",
            max_nsu="000000000000000",
        )

    monkeypatch.setattr(
        "apps.fiscal.services.sefaz.importar_por_chave.consultar_distribuicao_por_chave",
        fake_consulta,
    )

    resultado = importar_nfe_por_chave(CHAVE_VALIDA, config=get_sefaz_config())
    assert resultado.sucesso is False
    assert resultado.status == "nao_encontrada"


@pytest.mark.django_db
def test_importar_por_chave_chave_invalida():
    resultado = importar_nfe_por_chave("123")
    assert resultado.sucesso is False
    assert resultado.status == "erro"


@pytest.mark.django_db
def test_endpoint_importar_por_chave(monkeypatch):
    from django.contrib.auth import get_user_model
    from django.urls import reverse
    from rest_framework.test import APIClient

    from apps.fiscal.services.sefaz.importar_por_chave import ImportarPorChaveResultado
    from apps.fiscal.services.sefaz.status import SefazSyncStatus

    user = get_user_model().objects.create_user(
        email="fiscal-chave@test.com",
        password="pass12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")

    def fake_status():
        return SefazSyncStatus(
            provider="native",
            certificado_a1_configurado=True,
            sefaz_sync_disponivel=True,
            sefaz_sync_modo="producao",
            sefaz_sync_mensagem="ok",
        )

    monkeypatch.setattr(
        "apps.fiscal.api.sefaz_sync_views.montar_status_sefaz_sync", fake_status
    )

    def fake_importar(chave, *, config, certificado=None):
        return ImportarPorChaveResultado(
            chave=chave,
            sucesso=True,
            status="importada",
            mensagem="NF-e importada da SEFAZ.",
            documento_id=99,
            cstat="138",
            motivo="ok",
        )

    monkeypatch.setattr(
        "apps.fiscal.api.sefaz_sync_views.importar_nfe_por_chave", fake_importar
    )

    with override_settings(FISCAL_EMPRESA_CNPJ="98765432000188", FISCAL_SEFAZ_PROVIDER="stub"):
        resp = client.post(IMPORT_CHAVE_URL, {"chaves": [CHAVE_VALIDA]}, format="json")

    assert resp.status_code == 200
    assert resp.data["total"] == 1
    assert resp.data["importadas"] == 1
    assert resp.data["resultados"][0]["chave"] == CHAVE_VALIDA


@pytest.mark.django_db
def test_endpoint_importar_por_chave_sem_chave_valida(monkeypatch):
    from django.contrib.auth import get_user_model
    from django.urls import reverse
    from rest_framework.test import APIClient

    user = get_user_model().objects.create_user(
        email="fiscal-chave2@test.com",
        password="pass12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")

    resp = client.post(IMPORT_CHAVE_URL, {"chave": "123"}, format="json")
    assert resp.status_code == 400
