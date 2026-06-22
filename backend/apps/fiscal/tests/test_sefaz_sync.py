import base64
import gzip
from datetime import datetime, timedelta, timezone
from pathlib import Path

import pytest
from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.x509.oid import NameOID
from django.test import override_settings
from lxml import etree as LET

from apps.fiscal.choices import OrigemImportacaoFiscalChoices
from apps.fiscal.models import ControleNSU, DocumentoFiscalRecebido, DocumentoSefazDistribuido
from apps.fiscal.services.sefaz.certificado import CertificadoA1
from apps.fiscal.services.sefaz.config import SefazConfig, get_sefaz_config
from apps.fiscal.services.sefaz.distribuicao_dfe import _montar_envelope_soap
from apps.fiscal.services.sefaz.manifestacao import (
    NFeLegacySHA1Signer,
    _montar_envelope_recepcao_evento,
    _parse_resposta_manifestacao,
    assinar_env_evento,
    montar_xml_env_evento,
)
from apps.fiscal.services.sefaz.parse_dist_dfe import (
    parse_resposta_distribuicao_dfe,
    xml_importavel_como_nfe,
)
from apps.fiscal.services.sefaz.xml_namespaces import C14N_XML_20010315
from apps.fiscal.services.sefaz.nsu_sync import executar_sincronizacao_nsu, redefinir_nsu_sefaz

SAMPLE_NFE = Path(__file__).resolve().parent / "fixtures_sample_nfe_homolog.xml"


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
def test_redefinir_nsu_sefaz_zera_e_remove_bloqueio():
    from django.utils import timezone

    controle = ControleNSU.objects.create(
        cnpj="98765432000188",
        ultimo_nsu="000000000000500",
        max_nsu="000000000000500",
        bloqueado_ate=timezone.now() + timezone.timedelta(hours=1),
    )
    atualizado = redefinir_nsu_sefaz("98765432000188", novo_nsu="0")
    assert atualizado.pk == controle.pk
    assert atualizado.ultimo_nsu == "000000000000000"
    assert atualizado.max_nsu == "000000000000000"
    assert atualizado.bloqueado_ate is None


@pytest.mark.django_db
def test_redefinir_nsu_sefaz_define_valor_e_aceita_cnpj_mascarado():
    controle = redefinir_nsu_sefaz("98.765.432/0001-88", novo_nsu="50")
    assert controle.cnpj == "98765432000188"
    assert controle.ultimo_nsu == "000000000000050"


@pytest.mark.django_db
def test_redefinir_nsu_sefaz_cnpj_invalido():
    with pytest.raises(ValueError):
        redefinir_nsu_sefaz("123", novo_nsu="0")


@pytest.mark.django_db
@override_settings(
    FISCAL_EMPRESA_CNPJ="98765432000188",
    FISCAL_SEFAZ_PROVIDER="stub",
)
def test_sync_registra_erro_quando_stub_retorna_cstat_invalido(monkeypatch):
    def fake_stub(*, ultimo_nsu: str):
        from apps.fiscal.services.sefaz.parse_dist_dfe import DistDfeResultado

        return DistDfeResultado(
            cstat="280",
            xmotivo="Certificado inválido",
            ultimo_nsu=ultimo_nsu,
            max_nsu=ultimo_nsu,
        )

    monkeypatch.setattr(
        "apps.fiscal.services.sefaz.distribuicao_dfe.consultar_distribuicao_stub",
        fake_stub,
    )

    resultado = executar_sincronizacao_nsu(processar_manifestacoes=False)
    assert resultado.sucesso is False
    assert resultado.ultimo_cstat == "280"
    assert any("280" in alerta for alerta in resultado.alertas)


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


@pytest.mark.django_db
@override_settings(
    FISCAL_EMPRESA_CNPJ="98765432000188",
    FISCAL_SEFAZ_PROVIDER="stub",
    FISCAL_SYNC_MAX_CICLOS=3,
)
def test_sync_para_e_bloqueia_temporariamente_quando_cstat_137(monkeypatch):
    from apps.fiscal.services.sefaz.parse_dist_dfe import DistDfeResultado

    chamadas: list[str] = []

    def fake_consulta(*, config, ultimo_nsu, certificado=None):
        chamadas.append(ultimo_nsu)
        return DistDfeResultado(
            cstat="137",
            xmotivo="Nenhum documento localizado",
            ultimo_nsu="000000000000050",
            max_nsu="000000000000200",
        )

    monkeypatch.setattr(
        "apps.fiscal.services.sefaz.nsu_sync.consultar_distribuicao_por_nsu",
        fake_consulta,
    )

    resultado = executar_sincronizacao_nsu(processar_manifestacoes=False)
    assert resultado.ciclos_executados == 1
    assert chamadas == ["000000000000000"]
    assert resultado.ultimo_nsu == "000000000000050"
    assert ControleNSU.objects.get(cnpj="98765432000188").bloqueado_ate is not None


def test_parse_resposta_distribuicao_dfe_extrai_xml():
    xml_nfe = SAMPLE_NFE.read_text(encoding="utf-8")
    resultado = parse_resposta_distribuicao_dfe(
        _soap_com_nfe(xml_nfe),
        ultimo_nsu_consulta="000000000000000",
    )
    assert resultado.cstat == "138"
    assert len(resultado.documentos) == 1
    assert "infNFe" in resultado.documentos[0].xml


def test_parse_resposta_distribuicao_dfe_extrai_resumo_nfe():
    chave = "35200123456789012345678901234567890123456123"
    resumo = (
        "<resNFe>"
        f"<chNFe>{chave}</chNFe>"
        "<CNPJ>12345678000199</CNPJ>"
        "<xNome>Fornecedor Teste</xNome>"
        "<dhEmi>2026-06-01T10:00:00-03:00</dhEmi>"
        "<vNF>123.45</vNF>"
        "<nProt>123</nProt>"
        "<cSitNFe>1</cSitNFe>"
        "</resNFe>"
    )
    compactado = base64.b64encode(gzip.compress(resumo.encode("utf-8"))).decode("ascii")
    soap = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
      <cStat>138</cStat>
      <xMotivo>Documento localizado</xMotivo>
      <ultNSU>000000000000001</ultNSU>
      <maxNSU>000000000000001</maxNSU>
      <loteDistDFeInt>
        <docZip NSU="000000000000001" schema="resNFe_v1.01.xsd">{compactado}</docZip>
      </loteDistDFeInt>
    </retDistDFeInt>
  </soap:Body>
</soap:Envelope>"""
    resultado = parse_resposta_distribuicao_dfe(soap, ultimo_nsu_consulta="000000000000000")
    assert resultado.documentos == []
    assert resultado.documentos_ignorados == 0
    assert resultado.schemas_ignorados == {}
    assert len(resultado.resumos_nfe) == 1
    assert resultado.resumos_nfe[0].chave_acesso == chave


@pytest.mark.django_db
@override_settings(
    FISCAL_EMPRESA_CNPJ="98765432000188",
    FISCAL_SEFAZ_PROVIDER="stub",
)
def test_sync_armazena_resumo_nfe_distribuido(monkeypatch):
    chave = "35200123456789012345678901234567890123456123"
    resumo = (
        "<resNFe>"
        f"<chNFe>{chave}</chNFe>"
        "<CNPJ>12345678000199</CNPJ>"
        "<xNome>Fornecedor Teste</xNome>"
        "<dhEmi>2026-06-01T10:00:00-03:00</dhEmi>"
        "<vNF>123.45</vNF>"
        "<nProt>123</nProt>"
        "<cSitNFe>1</cSitNFe>"
        "</resNFe>"
    )
    compactado = base64.b64encode(gzip.compress(resumo.encode("utf-8"))).decode("ascii")
    soap = f"""<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <retDistDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
      <cStat>138</cStat>
      <xMotivo>Documento localizado</xMotivo>
      <ultNSU>000000000000001</ultNSU>
      <maxNSU>000000000000001</maxNSU>
      <loteDistDFeInt>
        <docZip NSU="000000000000001" schema="resNFe_v1.01.xsd">{compactado}</docZip>
      </loteDistDFeInt>
    </retDistDFeInt>
  </soap:Body>
</soap:Envelope>"""

    def fake_consulta(*, config, ultimo_nsu, certificado=None):
        return parse_resposta_distribuicao_dfe(soap, ultimo_nsu_consulta=ultimo_nsu)

    monkeypatch.setattr(
        "apps.fiscal.services.sefaz.nsu_sync.consultar_distribuicao_por_nsu",
        fake_consulta,
    )

    resultado = executar_sincronizacao_nsu(processar_manifestacoes=False)
    assert resultado.resumos_armazenados == 1
    assert resultado.resumos_novos == 1
    doc = DocumentoSefazDistribuido.objects.get(chave_acesso=chave)
    assert doc.nome_emitente == "Fornecedor Teste"
    assert doc.cnpj_destinatario == "98765432000188"


def test_xml_importavel_como_nfe():
    assert xml_importavel_como_nfe("<nfeProc><NFe/></nfeProc>") is True
    assert xml_importavel_como_nfe("<resNFe><chNFe/></resNFe>") is False


def test_envelope_dist_dfe_envia_dados_msg_como_xml():
    envelope = _montar_envelope_soap('<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01" />')
    assert "<nfeDadosMsg><distDFeInt" in envelope
    assert "&lt;distDFeInt" not in envelope


def test_montar_xml_env_evento_manifestacao():
    xml = montar_xml_env_evento(
        chave_acesso="35200123456789012345678901234567890123456123",
        cnpj="98765432000188",
        tipo="CIENCIA",
        ambiente="2",
    )
    assert "210210" in xml
    assert "98765432000188" in xml


def test_assinador_manifestacao_aceita_sha1_legado():
    signer = NFeLegacySHA1Signer(
        signature_algorithm="rsa-sha1",
        digest_algorithm="sha1",
    )

    assert signer.sign_alg.name == "RSA_SHA1"
    assert signer.digest_alg.name == "SHA1"


def _certificado_teste() -> CertificadoA1:
    key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    subject = issuer = x509.Name(
        [x509.NameAttribute(NameOID.COMMON_NAME, "Certificado Teste")]
    )
    cert = (
        x509.CertificateBuilder()
        .subject_name(subject)
        .issuer_name(issuer)
        .public_key(key.public_key())
        .serial_number(x509.random_serial_number())
        .not_valid_before(datetime.now(timezone.utc) - timedelta(days=1))
        .not_valid_after(datetime.now(timezone.utc) + timedelta(days=1))
        .sign(key, hashes.SHA256())
    )
    return CertificadoA1(
        key_pem=key.private_bytes(
            serialization.Encoding.PEM,
            serialization.PrivateFormat.PKCS8,
            serialization.NoEncryption(),
        ),
        cert_pem=cert.public_bytes(serialization.Encoding.PEM),
        ca_pems=[],
    )


def test_assinar_env_evento_aceita_elemento_lxml():
    xml = montar_xml_env_evento(
        chave_acesso="35200123456789012345678901234567890123456123",
        cnpj="98765432000188",
        tipo="CIENCIA",
        ambiente="2",
    )

    cert = _certificado_teste()
    assinado = assinar_env_evento(xml, cert)

    assert "evento" in assinado
    assert "Signature" in assinado
    assert 'URI="#ID210210' in assinado
    assert "ns0:" not in assinado
    # A NF-e exige a assinatura SEM prefixo de namespace (rejeição 404 caso contrário)
    # e no namespace XML-DSig padrão, sem nenhum xmlns="" espúrio (rejeição 297).
    assert "ds:" not in assinado
    assert 'Signature xmlns="http://www.w3.org/2000/09/xmldsig#"' in assinado
    assert 'xmlns=""' not in assinado
    assert "<SignedInfo>" in assinado
    assert "<Transform " in assinado
    assert "<DigestValue>" in assinado
    assert "<SignatureValue>" in assinado
    assert "<X509Certificate>" in assinado

    # A referência deve apontar para o Id do infEvento e usar C14N inclusiva + SHA1.
    ns_ds = "{http://www.w3.org/2000/09/xmldsig#}"
    raiz = LET.fromstring(assinado.encode("utf-8"))
    evento = raiz.find("{http://www.portalfiscal.inf.br/nfe}evento")
    sig = evento.find(f"{ns_ds}Signature")
    reference = sig.find(f"{ns_ds}SignedInfo/{ns_ds}Reference")
    assert reference.get("URI") == "#ID2102103520012345678901234567890123456789012345612301"
    transforms = [t.get("Algorithm") for t in reference.findall(f"{ns_ds}Transforms/{ns_ds}Transform")]
    assert "http://www.w3.org/2000/09/xmldsig#enveloped-signature" in transforms
    assert C14N_XML_20010315 in transforms

    # DigestValue e SignatureValue presentes e em base64 válido.
    digest_value = reference.find(f"{ns_ds}DigestValue").text
    signature_value = sig.find(f"{ns_ds}SignatureValue").text
    assert base64.b64decode(digest_value)
    assert base64.b64decode(signature_value)


def test_envelope_recepcao_evento_usa_nfe_dados_msg_direto():
    envelope = _montar_envelope_recepcao_evento(
        '<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00" />'
    )

    assert "<nfeDadosMsg" in envelope
    assert "<nfeRecepcaoEvento" not in envelope


def test_parse_manifestacao_prefere_cstat_do_evento():
    resposta = """<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://www.w3.org/2003/05/soap-envelope">
  <soap:Body>
    <nfeRecepcaoEventoNFResult xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">
      <retEnvEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">
        <cStat>128</cStat>
        <xMotivo>Lote de Evento Processado</xMotivo>
        <retEvento versao="1.00">
          <infEvento>
            <cStat>573</cStat>
            <xMotivo>Duplicidade de Evento</xMotivo>
          </infEvento>
        </retEvento>
      </retEnvEvento>
    </nfeRecepcaoEventoNFResult>
  </soap:Body>
</soap:Envelope>"""

    resultado = _parse_resposta_manifestacao(resposta)

    assert resultado.sucesso is False
    assert resultado.cstat == "573"
    assert resultado.motivo == "Duplicidade de Evento"


@override_settings(
    FISCAL_EMPRESA_CNPJ="07284171000139",
    FISCAL_SEFAZ_UF="42",
    FISCAL_CERT_PATH="/tmp/cert.pfx",
    FISCAL_CERT_PASSWORD="secret",
    FISCAL_AUTO_CIENCIA=False,
)
def test_get_sefaz_config_lê_settings():
    cfg = get_sefaz_config()
    assert cfg.cnpj == "07284171000139"
    assert cfg.uf == "42"
    assert isinstance(cfg, SefazConfig)
    assert cfg.auto_ciencia is False


@override_settings(FISCAL_AUTO_CIENCIA=True)
def test_get_sefaz_config_le_auto_ciencia():
    assert get_sefaz_config().auto_ciencia is True


@pytest.mark.django_db
def test_auto_ciencia_marca_resumos_pendentes_e_preserva_manifestados():
    from apps.fiscal.choices import (
        StatusManifestacaoDestinatarioChoices,
        TipoDocumentoSefazDistribuidoChoices,
        TipoManifestacaoDestinatarioChoices,
    )
    from apps.fiscal.services.sefaz.manifestacao_worker import solicitar_ciencia_automatica

    novo = DocumentoSefazDistribuido.objects.create(
        chave_acesso="42260614456688000123550010001758931534438781",
        nsu="000000000004188",
        cnpj_destinatario="07284171000139",
        tipo_documento=TipoDocumentoSefazDistribuidoChoices.RESUMO_NFE,
    )
    ja_manifestado = DocumentoSefazDistribuido.objects.create(
        chave_acesso="32260692660406004025550050001150851000024273",
        nsu="000000000004189",
        cnpj_destinatario="07284171000139",
        tipo_documento=TipoDocumentoSefazDistribuidoChoices.RESUMO_NFE,
        manifestacao_status=StatusManifestacaoDestinatarioChoices.MANIFESTADA,
        manifestacao_tipo=TipoManifestacaoDestinatarioChoices.CIENCIA,
    )

    marcados = solicitar_ciencia_automatica()

    assert marcados == 1
    novo.refresh_from_db()
    assert novo.manifestacao_status == StatusManifestacaoDestinatarioChoices.PENDENTE
    assert novo.manifestacao_tipo == TipoManifestacaoDestinatarioChoices.CIENCIA
    ja_manifestado.refresh_from_db()
    assert ja_manifestado.manifestacao_status == StatusManifestacaoDestinatarioChoices.MANIFESTADA


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
def test_api_sincronizar_nfes_sefaz_portal(jwt_client, monkeypatch, tmp_path):
    cert = tmp_path / "cert.pfx"
    cert.write_bytes(b"fake-cert")
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

    with override_settings(
        FISCAL_EMPRESA_CNPJ="98765432000188",
        FISCAL_SEFAZ_PROVIDER="native",
        FISCAL_CERT_PATH=str(cert),
        FISCAL_CERT_PASSWORD="senha",
    ):
        resp = jwt_client.post("/api/v1/fiscal/nfes/sincronizar-sefaz/")

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["sucesso"] is True
    assert resp.data["documentos_novos"] == 2
    assert chamadas["count"] == 1


@pytest.mark.django_db
@override_settings(
    FISCAL_EMPRESA_CNPJ="98765432000188",
    FISCAL_SEFAZ_PROVIDER="stub",
)
def test_api_sincronizar_retorna_503_sem_certificado_real(jwt_client):
    from rest_framework import status

    resp = jwt_client.post("/api/v1/fiscal/nfes/sincronizar-sefaz/")
    assert resp.status_code == status.HTTP_503_SERVICE_UNAVAILABLE
    assert "simulado" in resp.data["detail"].lower()
