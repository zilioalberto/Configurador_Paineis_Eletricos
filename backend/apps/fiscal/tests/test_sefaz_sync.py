import base64
import gzip
from pathlib import Path

import pytest
from django.test import override_settings

from apps.fiscal.choices import OrigemImportacaoFiscalChoices
from apps.fiscal.models import ControleNSU, DocumentoFiscalRecebido
from apps.fiscal.services.sefaz.config import SefazConfig, get_sefaz_config
from apps.fiscal.services.sefaz.manifestacao import montar_xml_env_evento
from apps.fiscal.services.sefaz.parse_dist_dfe import (
    parse_resposta_distribuicao_dfe,
    xml_importavel_como_nfe,
)
from apps.fiscal.services.sefaz.nsu_sync import executar_sincronizacao_nsu

SAMPLE_NFE = Path(__file__).resolve().parents[4] / "tools" / "fiscal_ponte" / "homolog" / "fixtures" / "sample_nfe_homolog.xml"


def _soap_com_nfe(xml_nfe: str, *, cstat: str = "138", ult_nsu: str = "000000000000001") -> str:
    compactado = base64.b64encode(gzip.compress(xml_nfe.encode("utf-8"))).decode("ascii")
    return f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeDistDFeInteresseResponse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDistDFeInteresseResult>
        <retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>2</tpAmb>
          <cStat>{cstat}</cStat>
          <xMotivo>ok</xMotivo>
          <ultNSU>{ult_nsu}</ultNSU>
          <maxNSU>{ult_nsu}</maxNSU>
          <loteDistDFeInt>
            <docZip NSU="{ult_nsu}" schema="procNFe_v4.00.xsd">{compactado}</docZip>
          </loteDistDFeInt>
        </retDistDFeInt>
      </nfeDistDFeInteresseResult>
    </nfeDistDFeInteresseResponse>
  </soap:Body>
</soap:Envelope>"""


@pytest.mark.django_db
@override_settings(
    FISCAL_EMPRESA_CNPJ="98765432000188",
    FISCAL_SEFAZ_UF="35",
    FISCAL_SEFAZ_AMBIENTE="2",
    FISCAL_SEFAZ_PROVIDER="stub",
    FISCAL_CERT_PATH="",
    FISCAL_CERT_PASSWORD="",
)
def test_executar_sincronizacao_stub_atualiza_controle_nsu():
    resultado = executar_sincronizacao_nsu()
    assert resultado.sucesso is True
    controle = ControleNSU.objects.get(cnpj="98765432000188")
    assert controle.ultimo_cstat == "137"
    assert controle.ultima_consulta is not None


@pytest.mark.django_db
@override_settings(
    FISCAL_EMPRESA_CNPJ="98765432000188",
    FISCAL_SEFAZ_PROVIDER="stub",
)
def test_sync_stub_importa_quando_mock_retorna_xml(monkeypatch):
    xml_nfe = SAMPLE_NFE.read_text(encoding="utf-8")
    soap = _soap_com_nfe(xml_nfe)

    def fake_consulta(*, config, ultimo_nsu, certificado=None):
        from apps.fiscal.services.sefaz.parse_dist_dfe import parse_resposta_distribuicao_dfe

        return parse_resposta_distribuicao_dfe(soap, ultimo_nsu_consulta=ultimo_nsu)

    monkeypatch.setattr(
        "apps.fiscal.services.sefaz.nsu_sync.consultar_distribuicao_por_nsu",
        fake_consulta,
    )

    resultado = executar_sincronizacao_nsu(processar_manifestacoes=False)
    assert resultado.documentos_novos == 1
    doc = DocumentoFiscalRecebido.objects.get()
    assert doc.origem_importacao == OrigemImportacaoFiscalChoices.SEFAZ_SYNC


def test_parse_resposta_distribuicao_dfe_extrai_xml():
    xml_nfe = SAMPLE_NFE.read_text(encoding="utf-8")
    resultado = parse_resposta_distribuicao_dfe(
        _soap_com_nfe(xml_nfe),
        ultimo_nsu_consulta="000000000000000",
    )
    assert resultado.cstat == "138"
    assert len(resultado.documentos) == 1
    assert "infNFe" in resultado.documentos[0].xml


def test_xml_importavel_como_nfe():
    assert xml_importavel_como_nfe("<nfeProc><NFe/></nfeProc>") is True
    assert xml_importavel_como_nfe("<resNFe><chNFe/></resNFe>") is False


def test_montar_xml_env_evento_manifestacao():
    xml = montar_xml_env_evento(
        chave_acesso="35200123456789012345678901234567890123456123",
        cnpj="98765432000188",
        tipo="CIENCIA",
        ambiente="2",
    )
    assert "210210" in xml
    assert "98765432000188" in xml


@override_settings(
    FISCAL_EMPRESA_CNPJ="07284171000139",
    FISCAL_SEFAZ_UF="42",
    FISCAL_CERT_PATH="/tmp/cert.pfx",
    FISCAL_CERT_PASSWORD="secret",
)
def test_get_sefaz_config_lê_settings():
    cfg = get_sefaz_config()
    assert cfg.cnpj == "07284171000139"
    assert cfg.uf == "42"
    assert isinstance(cfg, SefazConfig)


@pytest.fixture
def jwt_client():
    from django.contrib.auth import get_user_model
    from django.urls import reverse
    from rest_framework.test import APIClient

    from core.choices.usuarios import TipoUsuarioChoices

    User = get_user_model()
    client = APIClient()
    user = User.objects.create_user(
        email="sync-api@test.com",
        password="pass12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.mark.django_db
@override_settings(
    FISCAL_EMPRESA_CNPJ="98765432000188",
    FISCAL_SEFAZ_PROVIDER="stub",
)
def test_api_sincronizar_nfes_sefaz_portal(jwt_client, monkeypatch):
    chamadas = {"count": 0}

    def fake_sync(*, config=None, dry_run=False, processar_manifestacoes=True):
        chamadas["count"] += 1
        from apps.fiscal.services.sefaz.nsu_sync import SyncNsuResult

        return SyncNsuResult(
            sucesso=True,
            mensagem="ok teste",
            documentos_novos=2,
            ultimo_cstat="137",
            ultimo_nsu="000000000000010",
            max_nsu="000000000000010",
        )

    monkeypatch.setattr(
        "apps.fiscal.api.sefaz_sync_views.executar_sincronizacao_nsu",
        fake_sync,
    )

    from rest_framework import status

    resp = jwt_client.post("/api/v1/fiscal/nfes/sincronizar-sefaz/")
    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["sucesso"] is True
    assert resp.data["documentos_novos"] == 2
    assert chamadas["count"] == 1
