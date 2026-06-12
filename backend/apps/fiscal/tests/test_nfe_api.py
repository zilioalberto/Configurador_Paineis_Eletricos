import pytest
from django.contrib.auth import get_user_model
from django.test import override_settings
from django.urls import reverse
from rest_framework import status
from rest_framework.test import APIClient

from apps.fiscal.models import ControleNSU, DocumentoFiscalRecebido
from apps.fiscal.services.importar_xml_nfe_service import importar_xml_nfe
from apps.fiscal.tests.fixtures_nfe_xml import CHAVE_NFE_RAIZ, CHAVE_NFE_TESTE, XML_NFE_PROC
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()

FISCAL_TEST_TOKEN = "fiscal-agent-test-token-seguro"
IMPORT_URL = "/api/v1/fiscal/nfes/importar-xml/"
IMPORT_PORTAL_URL = "/api/v1/fiscal/nfes/importar-manual/"
IMPORT_EMITIDA_URL = "/api/v1/fiscal/nfes-emitidas/importar-manual/"
NSU_URL = "/api/v1/fiscal/nsu/98765432000188/"

XML_NFSE_TESTE = """<?xml version="1.0" encoding="UTF-8"?>
<CompNfse>
  <Nfse>
    <InfNfse>
      <Numero>900</Numero>
      <CodigoVerificacao>ABC123</CodigoVerificacao>
      <DataEmissao>2026-06-10T09:00:00</DataEmissao>
      <Servico>
        <Valores>
          <ValorServicos>2500.00</ValorServicos>
        </Valores>
        <Discriminacao>Serviço de engenharia ZFW</Discriminacao>
      </Servico>
      <Prestador>
        <Cnpj>98765432000188</Cnpj>
        <RazaoSocial>ZFW Engenharia</RazaoSocial>
      </Prestador>
      <Tomador>
        <Cnpj>12345678000199</Cnpj>
        <RazaoSocial>Cliente Industrial</RazaoSocial>
      </Tomador>
    </InfNfse>
  </Nfse>
</CompNfse>
"""

XML_NFSE_ABRASF_TOMADOR_SERVICO = """<?xml version="1.0" encoding="UTF-8"?>
<CompNfse>
  <Nfse>
    <InfNfse>
      <Numero>901</Numero>
      <CodigoVerificacao>DEF456</CodigoVerificacao>
      <DataEmissao>2026-06-11T09:00:00</DataEmissao>
      <Servico>
        <Valores>
          <ValorServicos>14400.00</ValorServicos>
        </Valores>
        <Discriminacao>SERVIÇO DE MÃO-DE-OBRA CONFORME PEDIDO N°: 12943.</Discriminacao>
      </Servico>
      <PrestadorServico>
        <IdentificacaoPrestador>
          <Cnpj>07284171000139</Cnpj>
        </IdentificacaoPrestador>
        <RazaoSocial>ZFW Engenharia</RazaoSocial>
      </PrestadorServico>
      <TomadorServico>
        <IdentificacaoTomador>
          <CpfCnpj>
            <Cnpj>08053030000110</Cnpj>
          </CpfCnpj>
        </IdentificacaoTomador>
        <RazaoSocial>ETA Cubatão Saneamento LTDA</RazaoSocial>
      </TomadorServico>
    </InfNfse>
  </Nfse>
</CompNfse>
"""


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def fiscal_agent_settings():
    with override_settings(FISCAL_AGENT_TOKEN=FISCAL_TEST_TOKEN):
        yield


@pytest.fixture
def jwt_client(api_client):
    user = User.objects.create_user(
        email="fiscal-nfe-jwt@test.com",
        password="pass12345",
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    token = api_client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": "pass12345"},
        format="json",
    )
    assert token.status_code == 200
    api_client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return api_client


def _autenticar_agente(client: APIClient) -> None:
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {FISCAL_TEST_TOKEN}")


@pytest.mark.django_db
@pytest.mark.usefixtures("fiscal_cnpj_recebidas_settings")
class TestNfeApiAgent:
    def test_importar_sem_token_bloqueia(self, api_client, fiscal_agent_settings):
        api_client.credentials()
        resp = api_client.post(IMPORT_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_importar_token_invalido(self, api_client, fiscal_agent_settings):
        api_client.credentials(HTTP_AUTHORIZATION="Bearer token-errado")
        resp = api_client.post(IMPORT_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )

    def test_importar_com_token_valido(self, api_client, fiscal_agent_settings):
        _autenticar_agente(api_client)
        resp = api_client.post(
            IMPORT_URL,
            {
                "xml": XML_NFE_PROC,
                "origem_importacao": "MANUAL",
                "objetivo_entrada": "INDUSTRIALIZACAO",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] is True
        assert resp.data["chave_acesso"] == CHAVE_NFE_TESTE

    def test_importar_duplicada_retorna_200(self, api_client, fiscal_agent_settings):
        importar_xml_nfe(xml=XML_NFE_PROC)
        _autenticar_agente(api_client)
        resp = api_client.post(IMPORT_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["created"] is False

    def test_importar_xml_invalido_400(self, api_client, fiscal_agent_settings):
        _autenticar_agente(api_client)
        resp = api_client.post(IMPORT_URL, {"xml": "<invalid"}, format="json")
        assert resp.status_code == status.HTTP_400_BAD_REQUEST

    def test_nsu_sem_token_bloqueia(self, api_client, fiscal_agent_settings):
        api_client.credentials()
        resp = api_client.get(NSU_URL)
        assert resp.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_nsu_get_cria_controle(self, api_client, fiscal_agent_settings):
        _autenticar_agente(api_client)
        resp = api_client.get(NSU_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["cnpj"] == "98765432000188"
        assert resp.data["ultimo_nsu"] == "000000000000000"
        assert ControleNSU.objects.filter(cnpj="98765432000188").exists()

    def test_nsu_patch_atualiza(self, api_client, fiscal_agent_settings):
        _autenticar_agente(api_client)
        api_client.get(NSU_URL)
        resp = api_client.patch(
            NSU_URL,
            {
                "ultimo_nsu": "000000000123456",
                "ultimo_cstat": "137",
                "ultimo_motivo": "Nenhum documento localizado",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["ultimo_nsu"] == "000000000123456"
        assert resp.data["ultimo_cstat"] == "137"

    def test_token_nao_configurado_bloqueia(self, api_client):
        with override_settings(FISCAL_AGENT_TOKEN=""):
            _autenticar_agente(api_client)
            resp = api_client.post(IMPORT_URL, {"xml": XML_NFE_PROC}, format="json")
            assert resp.status_code == status.HTTP_403_FORBIDDEN


@pytest.mark.django_db
@pytest.mark.usefixtures("fiscal_cnpj_recebidas_settings")
class TestNfeApiJwt:
    def test_listar_nfes(self, jwt_client):
        importar_xml_nfe(xml=XML_NFE_PROC)
        resp = jwt_client.get("/api/v1/fiscal/nfes/")
        assert resp.status_code == status.HTTP_200_OK
        assert "results" in resp.data
        chaves = {r["chave_acesso"] for r in resp.data["results"]}
        assert CHAVE_NFE_TESTE in chaves
        primeiro = next(r for r in resp.data["results"] if r["chave_acesso"] == CHAVE_NFE_TESTE)
        assert "xml_original" not in primeiro
        assert primeiro["objetivo_entrada"] == "OUTRAS_ENTRADAS"

    def test_detalhar_nfe(self, jwt_client):
        doc = importar_xml_nfe(xml=XML_NFE_PROC)["documento"]
        resp = jwt_client.get(f"/api/v1/fiscal/nfes/{doc.id}/")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["xml_original"] == XML_NFE_PROC
        assert resp.data["objetivo_entrada"] == "OUTRAS_ENTRADAS"
        assert len(resp.data["itens"]) == 1

    def test_filtro_chave(self, jwt_client):
        importar_xml_nfe(xml=XML_NFE_PROC)
        resp = jwt_client.get(
            "/api/v1/fiscal/nfes/",
            {"chave_acesso": CHAVE_NFE_TESTE},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert len(resp.data["results"]) == 1

    def test_importar_manual_portal(self, jwt_client):
        resp = jwt_client.post(
            IMPORT_PORTAL_URL,
            {"xml": XML_NFE_PROC, "objetivo_entrada": "USO_CONSUMO"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] is True
        doc = DocumentoFiscalRecebido.objects.get(chave_acesso=CHAVE_NFE_TESTE)
        assert doc.origem_importacao == "MANUAL"
        assert doc.objetivo_entrada == "USO_CONSUMO"

    def test_importar_manual_duplicada(self, jwt_client):
        importar_xml_nfe(xml=XML_NFE_PROC)
        resp = jwt_client.post(IMPORT_PORTAL_URL, {"xml": XML_NFE_PROC}, format="json")
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["created"] is False

    @override_settings(FISCAL_EMPRESA_CNPJ="12345678000199")
    def test_importar_nfe_emitida_produto(self, jwt_client):
        resp = jwt_client.post(
            IMPORT_EMITIDA_URL,
            {
                "xml": XML_NFE_PROC,
                "tipo_documento": "NFE_PRODUTO",
                "objetivo_saida": "VENDA_PRODUTO",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        assert resp.data["created"] is True
        assert resp.data["documento_public_id"]
        detail = jwt_client.get(
            f"/api/v1/fiscal/nfes-emitidas/{resp.data['documento_public_id']}/"
        )
        assert detail.status_code == status.HTTP_200_OK
        assert detail.data["id"] == resp.data["documento_id"]
        assert detail.data["public_id"] == resp.data["documento_public_id"]
        assert detail.data["tipo_documento"] == "NFE_PRODUTO"
        assert detail.data["objetivo_saida"] == "VENDA_PRODUTO"
        assert len(detail.data["itens"]) == 1

        detail_por_id = jwt_client.get(
            f"/api/v1/fiscal/nfes-emitidas/{resp.data['documento_id']}/"
        )
        assert detail_por_id.status_code == status.HTTP_404_NOT_FOUND

    @override_settings(FISCAL_EMPRESA_CNPJ="12345678000199")
    def test_excluir_nfe_emitida_importada(self, jwt_client):
        from apps.fiscal.models import DocumentoFiscalEmitido, ItemDocumentoFiscalEmitido

        resp = jwt_client.post(
            IMPORT_EMITIDA_URL,
            {"xml": XML_NFE_PROC, "tipo_documento": "NFE_PRODUTO"},
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        public_id = resp.data["documento_public_id"]
        documento_id = resp.data["documento_id"]
        assert ItemDocumentoFiscalEmitido.objects.filter(documento_id=documento_id).exists()

        delete_resp = jwt_client.delete(f"/api/v1/fiscal/nfes-emitidas/{public_id}/")
        assert delete_resp.status_code == status.HTTP_204_NO_CONTENT
        assert not DocumentoFiscalEmitido.objects.filter(public_id=public_id).exists()
        assert not ItemDocumentoFiscalEmitido.objects.filter(documento_id=documento_id).exists()

        detail = jwt_client.get(f"/api/v1/fiscal/nfes-emitidas/{public_id}/")
        assert detail.status_code == status.HTTP_404_NOT_FOUND

    @override_settings(FISCAL_EMPRESA_CNPJ="12345678000199")
    def test_listar_emitidas_ordenacao_destinatario(self, jwt_client):
        jwt_client.post(
            IMPORT_EMITIDA_URL,
            {"xml": XML_NFE_PROC, "tipo_documento": "NFE_PRODUTO"},
            format="json",
        )

        from apps.fiscal.models import DocumentoFiscalEmitido

        base = DocumentoFiscalEmitido.objects.get()
        DocumentoFiscalEmitido.objects.create(
            identificador=CHAVE_NFE_RAIZ,
            tipo_documento=base.tipo_documento,
            chave_acesso=CHAVE_NFE_RAIZ,
            cnpj_emitente=base.cnpj_emitente,
            nome_emitente=base.nome_emitente,
            cnpj_destinatario="11111111000111",
            nome_destinatario="AAA Cliente",
            numero="101",
            serie="1",
            valor_total=base.valor_total,
            xml_original=base.xml_original,
        )
        DocumentoFiscalEmitido.objects.filter(numero="100").update(nome_destinatario="ZZZ Cliente")

        resp = jwt_client.get(
            "/api/v1/fiscal/nfes-emitidas/",
            {"ordering": "nome_destinatario", "page_size": 50},
        )
        assert resp.status_code == status.HTTP_200_OK
        nomes = [row["nome_destinatario"] for row in resp.data["results"]]
        assert nomes[0].startswith("AAA")

        resp_desc = jwt_client.get(
            "/api/v1/fiscal/nfes-emitidas/",
            {"ordering": "-nome_destinatario", "page_size": 50},
        )
        nomes_desc = [row["nome_destinatario"] for row in resp_desc.data["results"]]
        assert nomes_desc[0].startswith("ZZZ")

    @override_settings(FISCAL_EMPRESA_CNPJ="98765432000188")
    def test_importar_nfse_emitida_servico(self, jwt_client):
        resp = jwt_client.post(
            IMPORT_EMITIDA_URL,
            {
                "xml": XML_NFSE_TESTE,
                "tipo_documento": "NFSE_SERVICO",
                "objetivo_saida": "PRESTACAO_SERVICO",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        detail = jwt_client.get(
            f"/api/v1/fiscal/nfes-emitidas/{resp.data['documento_public_id']}/"
        )
        assert detail.data["numero"] == "900"
        assert detail.data["valor_total"] == "2500.00"
        assert detail.data["itens"][0]["descricao"] == "Serviço de engenharia ZFW"

    @override_settings(FISCAL_EMPRESA_CNPJ="07284171000139")
    def test_importar_nfse_emitida_tomador_servico_com_razao_social(self, jwt_client):
        resp = jwt_client.post(
            IMPORT_EMITIDA_URL,
            {
                "xml": XML_NFSE_ABRASF_TOMADOR_SERVICO,
                "tipo_documento": "NFSE_SERVICO",
                "objetivo_saida": "PRESTACAO_SERVICO",
            },
            format="json",
        )
        assert resp.status_code == status.HTTP_201_CREATED
        detail = jwt_client.get(
            f"/api/v1/fiscal/nfes-emitidas/{resp.data['documento_public_id']}/"
        )
        assert detail.data["cnpj_destinatario"] == "08053030000110"
        assert detail.data["nome_destinatario"] == "ETA Cubatão Saneamento LTDA"

    @override_settings(FISCAL_EMPRESA_CNPJ="07284171000139")
    def test_reimportar_nfse_emitida_preenche_participante_faltante(self, jwt_client):
        resp = jwt_client.post(
            IMPORT_EMITIDA_URL,
            {
                "xml": XML_NFSE_ABRASF_TOMADOR_SERVICO,
                "tipo_documento": "NFSE_SERVICO",
                "objetivo_saida": "PRESTACAO_SERVICO",
            },
            format="json",
        )
        documento_id = resp.data["documento_id"]
        documento_public_id = resp.data["documento_public_id"]
        from apps.fiscal.models import DocumentoFiscalEmitido

        DocumentoFiscalEmitido.objects.filter(pk=documento_id).update(nome_destinatario="")
        resp_reimport = jwt_client.post(
            IMPORT_EMITIDA_URL,
            {
                "xml": XML_NFSE_ABRASF_TOMADOR_SERVICO,
                "tipo_documento": "NFSE_SERVICO",
                "objetivo_saida": "PRESTACAO_SERVICO",
            },
            format="json",
        )
        assert resp_reimport.status_code == status.HTTP_200_OK
        detail = jwt_client.get(f"/api/v1/fiscal/nfes-emitidas/{documento_public_id}/")
        assert detail.data["nome_destinatario"] == "ETA Cubatão Saneamento LTDA"

    def test_relatorio_nfes_entradas(self, jwt_client):
        importar_xml_nfe(xml=XML_NFE_PROC, objetivo_entrada="INDUSTRIALIZACAO")
        resp = jwt_client.get(
            "/api/v1/fiscal/relatorios/nfes/",
            {"tipo_movimento": "ENTRADA", "objetivo_entrada": "INDUSTRIALIZACAO"},
        )
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["resumo"]["total_documentos"] == 1
        assert resp.data["resumo"]["valor_total"] == "52.50"
        assert resp.data["resumo"]["por_objetivo"][0]["tipo_movimento"] == "ENTRADA"
        assert resp.data["resumo"]["por_objetivo"][0]["objetivo"] == "INDUSTRIALIZACAO"
        assert resp.data["documentos"][0]["chave_acesso"] == CHAVE_NFE_TESTE
        assert len(resp.data["documentos"][0]["itens"]) == 1

    def test_relatorio_nfes_saida(self, jwt_client):
        jwt_client.post(
            IMPORT_EMITIDA_URL,
            {
                "xml": XML_NFSE_TESTE,
                "tipo_documento": "NFSE_SERVICO",
                "objetivo_saida": "PRESTACAO_SERVICO",
            },
            format="json",
        )
        resp = jwt_client.get("/api/v1/fiscal/relatorios/nfes/", {"tipo_movimento": "SAIDA"})
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["resumo"]["total_documentos"] == 1
        assert resp.data["resumo"]["valor_total"] == "2500.00"
        assert resp.data["resumo"]["por_objetivo"][0]["tipo_movimento"] == "SAIDA"
        assert resp.data["documentos"][0]["tipo_movimento"] == "SAIDA"
        assert resp.data["documentos"][0]["objetivo"] == "PRESTACAO_SERVICO"

    def test_nsu_get_jwt(self, jwt_client):
        resp = jwt_client.get(NSU_URL)
        assert resp.status_code == status.HTTP_200_OK
        assert resp.data["cnpj"] == "98765432000188"

    def test_nsu_patch_jwt_bloqueia(self, jwt_client):
        resp = jwt_client.patch(NSU_URL, {"ultimo_nsu": "000000000000001"}, format="json")
        assert resp.status_code in (
            status.HTTP_401_UNAUTHORIZED,
            status.HTTP_403_FORBIDDEN,
        )
