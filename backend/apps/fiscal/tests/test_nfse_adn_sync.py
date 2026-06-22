import base64
import gzip
from pathlib import Path

import pytest
from django.test import override_settings

from apps.fiscal.models import ControleNsuNfseAdn, DocumentoNfseRecebido
from apps.fiscal.services.nfse_adn import distribuicao_dfe as dd
from apps.fiscal.services.nfse_adn.config import NfseAdnConfig
from apps.fiscal.services.nfse_adn.importar_nfse_recebida import importar_xml_nfse_recebida
from apps.fiscal.services.nfse_adn.nsu_sync import (
    executar_sincronizacao_nfse_adn,
    redefinir_nsu_nfse_adn,
)
from apps.fiscal.services.nfse_adn.parse_dfe import parse_resposta_distribuicao_dfe
from apps.fiscal.tests.test_nfe_api import XML_NFSE_TESTE

CNPJ_ZFW = "07284171000139"

# Corpo real devolvido pelo ADN (com HTTP >= 400) quando não há documentos novos.
_BODY_E2220 = {
    "StatusProcessamento": "NENHUM_DOCUMENTO_LOCALIZADO",
    "LoteDFe": [],
    "Alertas": [],
    "Erros": [
        {
            "Mensagem": {},
            "Codigo": "E2220",
            "Descricao": (
                "Nenhum documento localizado - não existem documentos fiscais "
                "para o Contribuinte a partir do NSU informado."
            ),
        }
    ],
    "TipoAmbiente": "PRODUCAO",
}


def _config_native() -> NfseAdnConfig:
    return NfseAdnConfig(
        cnpj=CNPJ_ZFW,
        ambiente="1",
        cert_path=Path("inexistente.pfx"),
        cert_password="x",
        provider="native",
    )


def _xml_gzip_b64(xml: str) -> str:
    return base64.b64encode(gzip.compress(xml.encode("utf-8"))).decode("ascii")


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW)
def test_importar_nfse_recebida_manual():
    xml = XML_NFSE_TESTE.replace("12345678000199", CNPJ_ZFW)
    resultado = importar_xml_nfse_recebida(xml=xml)
    assert resultado["created"] is True
    assert DocumentoNfseRecebido.objects.filter(cnpj_tomador=CNPJ_ZFW).exists()


def test_parse_resposta_distribuicao_dfe_extrai_xml():
    payload = {
        "StatusProcessamento": "DocumentosLocalizados",
        "UltimoNSU": "000000000000001",
        "MaximoNSU": "000000000000001",
        "LoteDFe": [
            {
                "NSU": "000000000000001",
                "TipoDocumento": "NFSE",
                "ChaveAcesso": "A" * 50,
                "ArquivoXml": _xml_gzip_b64(XML_NFSE_TESTE),
            }
        ],
    }
    resultado = parse_resposta_distribuicao_dfe(payload, ultimo_nsu_consulta="0")
    assert len(resultado.documentos) == 1
    assert "InfNfse" in resultado.documentos[0].xml


@pytest.mark.django_db
@override_settings(
    FISCAL_EMPRESA_CNPJ=CNPJ_ZFW,
    FISCAL_NFSE_ADN_PROVIDER="stub",
)
def test_sync_stub_sem_documentos():
    resultado = executar_sincronizacao_nfse_adn()
    assert resultado.sucesso is True
    assert ControleNsuNfseAdn.objects.filter(cnpj=CNPJ_ZFW).exists()


def test_consultar_distribuicao_trata_e2220_como_vazio(monkeypatch):
    monkeypatch.setattr(NfseAdnConfig, "validate", lambda self: None)
    monkeypatch.setattr(dd, "get_json_adn", lambda **kwargs: (422, _BODY_E2220))
    resultado = dd.consultar_distribuicao_por_nsu(
        config=_config_native(),
        ultimo_nsu="000000000000114",
    )
    assert resultado.status_processamento.upper().replace("_", "") == "NENHUMDOCUMENTOLOCALIZADO"
    assert resultado.documentos == []


def test_consultar_distribuicao_erro_real_motivo_legivel(monkeypatch):
    monkeypatch.setattr(NfseAdnConfig, "validate", lambda self: None)
    body = {"Erros": [{"Codigo": "E0001", "Descricao": "Certificado sem autorizacao"}]}
    monkeypatch.setattr(dd, "get_json_adn", lambda **kwargs: (403, body))
    resultado = dd.consultar_distribuicao_por_nsu(
        config=_config_native(),
        ultimo_nsu="000000000000000",
    )
    assert resultado.status_processamento == "ERRO"
    assert "E0001" in resultado.motivo
    assert "Certificado sem autorizacao" in resultado.motivo


@pytest.mark.django_db
def test_redefinir_nsu_zera_e_remove_bloqueio():
    from django.utils import timezone

    controle = ControleNsuNfseAdn.objects.create(
        cnpj=CNPJ_ZFW,
        ultimo_nsu="000000000000114",
        max_nsu="000000000000114",
        bloqueado_ate=timezone.now() + timezone.timedelta(hours=1),
    )
    atualizado = redefinir_nsu_nfse_adn(CNPJ_ZFW, novo_nsu="0")
    assert atualizado.pk == controle.pk
    assert atualizado.ultimo_nsu == "000000000000000"
    assert atualizado.max_nsu == "000000000000000"
    assert atualizado.bloqueado_ate is None


@pytest.mark.django_db
def test_redefinir_nsu_define_valor_especifico():
    controle = redefinir_nsu_nfse_adn(CNPJ_ZFW, novo_nsu="100")
    assert controle.ultimo_nsu == "000000000000100"


@pytest.mark.django_db
def test_sync_nenhum_documento_e2220_nao_falha(monkeypatch):
    monkeypatch.setattr(NfseAdnConfig, "validate", lambda self: None)
    monkeypatch.setattr(dd, "get_json_adn", lambda **kwargs: (422, _BODY_E2220))
    resultado = executar_sincronizacao_nfse_adn(config=_config_native())
    assert resultado.sucesso is True
    assert resultado.documentos_novos == 0
    assert resultado.documentos_importados == 0
    assert resultado.ultimo_status.upper().replace("_", "") == "NENHUMDOCUMENTOLOCALIZADO"


@pytest.mark.django_db
@override_settings(FISCAL_EMPRESA_CNPJ=CNPJ_ZFW, FISCAL_NFSE_ADN_PROVIDER="stub")
def test_sync_importa_nfse_quando_stub_retorna_documento(monkeypatch):
    xml = XML_NFSE_TESTE.replace("12345678000199", CNPJ_ZFW)

    def fake_stub(*, ultimo_nsu: str):
        from apps.fiscal.services.nfse_adn.parse_dfe import AdnDfeDocumento, AdnDfeResultado

        return AdnDfeResultado(
            status_processamento="DocumentosLocalizados",
            ultimo_nsu="000000000000001",
            max_nsu="000000000000001",
            documentos=[
                AdnDfeDocumento(
                    nsu="000000000000001",
                    tipo_documento="NFSE",
                    chave_acesso="B" * 50,
                    xml=xml,
                )
            ],
        )

    monkeypatch.setattr(
        "apps.fiscal.services.nfse_adn.distribuicao_dfe.consultar_distribuicao_stub",
        fake_stub,
    )
    resultado = executar_sincronizacao_nfse_adn()
    assert resultado.documentos_novos == 1
    assert DocumentoNfseRecebido.objects.count() == 1
