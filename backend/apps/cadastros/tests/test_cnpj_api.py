import json
from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cadastros.models import CnaeParceiro, ParceiroComercial, SocioParceiro
from apps.cadastros.services.brasilapi_cnpj import mapear_resposta_brasilapi
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()

SAMPLE_CNPJ_PAYLOAD = {
    "uf": "SP",
    "cep": "01311902",
    "qsa": [
        {
            "nome_socio": "SOCIO TESTE",
            "qualificacao_socio": "Administrador",
            "data_entrada_sociedade": "2020-01-15",
            "faixa_etaria": "Entre 41 a 50 anos",
        }
    ],
    "cnpj": "19131243000197",
    "email": "contato@empresa.com",
    "bairro": "BELA VISTA",
    "numero": "37",
    "municipio": "SAO PAULO",
    "logradouro": "PAULISTA",
    "complemento": "ANDAR 4",
    "razao_social": "EMPRESA TESTE LTDA",
    "nome_fantasia": "EMPRESA TESTE",
    "capital_social": 150000.5,
    "ddd_telefone_1": "11999998888",
    "cnae_fiscal": 9430800,
    "cnae_fiscal_descricao": "Atividade principal teste",
    "cnaes_secundarios": [
        {"codigo": 6201501, "descricao": "Desenvolvimento de programas sob encomenda"},
        {"codigo": 6202300, "descricao": "Desenvolvimento e licenciamento de programas customizaveis"},
    ],
    "natureza_juridica": "Sociedade Limitada",
    "situacao_cadastral": 2,
    "data_inicio_atividade": "2015-03-10",
    "descricao_situacao_cadastral": "ATIVA",
    "descricao_tipo_de_logradouro": "AVENIDA",
    "descricao_identificador_matriz_filial": "MATRIZ",
}


def _auth_client(email: str, password: str) -> APIClient:
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": email, "password": password},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.fixture
def admin_client():
    raw = "cnpj-pass-12345"
    user = User.objects.create_user(
        email="cnpj-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    return _auth_client(user.email, raw), user


def _mock_urlopen_response(payload: dict):
    body = json.dumps(payload).encode("utf-8")

    class FakeResponse:
        def read(self, size=-1):
            if size is None or size < 0:
                return body
            return body[:size]

        def __enter__(self):
            return self

        def __exit__(self, *args):
            return False

    return FakeResponse()


@pytest.mark.django_db
class TestCnpjApi:
    def test_consulta_rejeita_cnpj_invalido_sem_chamar_api(self, admin_client):
        client, _ = admin_client
        with patch("apps.cadastros.services.brasilapi_cnpj.urlopen") as urlopen_mock:
            response = client.get(reverse("cadastros-cnpj-consulta", args=["11111111111111"]))
            urlopen_mock.assert_not_called()
        assert response.status_code == 400
        assert "invalido" in response.data["detail"].lower()

    def test_mapear_resposta_inclui_cnaes_principal_e_secundarios(self):
        preview = mapear_resposta_brasilapi(SAMPLE_CNPJ_PAYLOAD)
        assert len(preview.cnaes) == 3
        assert preview.cnaes[0].principal is True
        assert preview.cnaes[0].codigo == "9430800"
        assert preview.cnaes[1].principal is False
        assert preview.cnaes[1].codigo == "6201501"

    def test_mapear_resposta_sanitiza_conteudo_malicioso(self):
        payload = dict(SAMPLE_CNPJ_PAYLOAD)
        payload["razao_social"] = '<script>alert(1)</script>EMPRESA TESTE LTDA'
        payload["qsa"] = [
            {
                "nome_socio": "<img onerror=alert(1)> SOCIO TESTE",
                "qualificacao_socio": "Administrador",
            }
        ]
        preview = mapear_resposta_brasilapi(payload)
        assert "<script>" not in preview.razao_social
        assert "EMPRESA TESTE LTDA" in preview.razao_social
        assert "<img" not in preview.socios[0].nome
        assert preview.socios[0].nome == "SOCIO TESTE"

    @patch("apps.cadastros.services.brasilapi_cnpj.urlopen")
    def test_consulta_cnpj_preview(self, urlopen_mock, admin_client):
        client, _ = admin_client
        urlopen_mock.return_value = _mock_urlopen_response(SAMPLE_CNPJ_PAYLOAD)

        response = client.get(reverse("cadastros-cnpj-consulta", args=["19131243000197"]))

        assert response.status_code == 200
        assert response.data["documento"] == "19131243000197"
        assert response.data["razao_social"] == "EMPRESA TESTE LTDA"
        assert response.data["capital_social"] == "150000.5"
        assert len(response.data["socios"]) == 1
        assert response.data["socios"][0]["nome"] == "SOCIO TESTE"
        assert response.data["ja_cadastrado"] is False

    @patch("apps.cadastros.services.brasilapi_cnpj.urlopen")
    def test_salvar_cnpj_cria_parceiro_socios_e_endereco(self, urlopen_mock, admin_client):
        client, _ = admin_client
        urlopen_mock.return_value = _mock_urlopen_response(SAMPLE_CNPJ_PAYLOAD)

        response = client.post(
            reverse("cadastros-cnpj-salvar", args=["19131243000197"]),
            {
                "eh_cliente": True,
                "eh_fornecedor": True,
                "eh_parceiro": False,
            },
            format="json",
        )

        assert response.status_code == 201
        parceiro = ParceiroComercial.objects.get(documento="19131243000197")
        assert parceiro.origem == "BRASILAPI"
        assert parceiro.capital_social == Decimal("150000.5")
        assert parceiro.situacao_cadastral == "ATIVA"
        assert parceiro.enderecos.filter(principal=True).count() == 1
        assert SocioParceiro.objects.filter(parceiro=parceiro).count() == 1
        assert CnaeParceiro.objects.filter(parceiro=parceiro).count() == 3
        assert response.data["parceiro"]["cnaes"][0]["principal"] is True
        assert response.data["parceiro"]["socios"][0]["nome"] == "SOCIO TESTE"

    @patch("apps.cadastros.services.brasilapi_cnpj.urlopen")
    def test_salvar_rejeita_sem_classificacao(self, urlopen_mock, admin_client):
        client, _ = admin_client
        urlopen_mock.return_value = _mock_urlopen_response(SAMPLE_CNPJ_PAYLOAD)

        response = client.post(
            reverse("cadastros-cnpj-salvar", args=["19131243000197"]),
            {"eh_cliente": False, "eh_fornecedor": False, "eh_parceiro": False},
            format="json",
        )

        assert response.status_code == 400
        assert ParceiroComercial.objects.filter(documento="19131243000197").exists() is False

    @patch("apps.cadastros.services.brasilapi_cnpj.urlopen")
    def test_salvar_rejeita_cnpj_duplicado(self, urlopen_mock, admin_client):
        client, _ = admin_client
        urlopen_mock.return_value = _mock_urlopen_response(SAMPLE_CNPJ_PAYLOAD)
        ParceiroComercial.objects.create(
            documento="19131243000197",
            razao_social="Ja existe",
            eh_cliente=True,
        )

        response = client.post(
            reverse("cadastros-cnpj-salvar", args=["19131243000197"]),
            {"eh_cliente": True, "eh_fornecedor": False, "eh_parceiro": False},
            format="json",
        )

        assert response.status_code == 409

    @patch("apps.cadastros.services.brasilapi_cnpj.urlopen")
    def test_consulta_marca_ja_cadastrado_com_papeis(self, urlopen_mock, admin_client):
        client, _ = admin_client
        urlopen_mock.return_value = _mock_urlopen_response(SAMPLE_CNPJ_PAYLOAD)
        ParceiroComercial.objects.create(
            documento="19131243000197",
            razao_social="Ja existe",
            eh_cliente=True,
            eh_fornecedor=True,
            eh_parceiro=False,
        )

        response = client.get(reverse("cadastros-cnpj-consulta", args=["19131243000197"]))

        assert response.status_code == 200
        assert response.data["ja_cadastrado"] is True
        assert response.data["parceiro_existente_eh_cliente"] is True
        assert response.data["parceiro_existente_eh_fornecedor"] is True
        assert response.data["parceiro_existente_eh_parceiro"] is False

    @patch("apps.cadastros.services.brasilapi_cnpj.urlopen")
    def test_atualizar_cnpj_sincroniza_receita(self, urlopen_mock, admin_client):
        client, _ = admin_client
        urlopen_mock.return_value = _mock_urlopen_response(SAMPLE_CNPJ_PAYLOAD)
        parceiro = ParceiroComercial.objects.create(
            documento="19131243000197",
            razao_social="Nome antigo",
            eh_cliente=True,
            situacao_cadastral="BAIXADA",
        )
        SocioParceiro.objects.create(parceiro=parceiro, ordem=0, nome="Socio velho", qualificacao="")

        response = client.post(
            reverse("cadastros-cnpj-atualizar", args=["19131243000197"]),
            {
                "parceiro_id": str(parceiro.id),
                "eh_cliente": True,
                "eh_fornecedor": True,
                "eh_parceiro": False,
            },
            format="json",
        )

        assert response.status_code == 200
        parceiro.refresh_from_db()
        assert parceiro.razao_social == "EMPRESA TESTE LTDA"
        assert parceiro.situacao_cadastral == "ATIVA"
        assert parceiro.capital_social == Decimal("150000.5")
        assert parceiro.eh_fornecedor is True
        assert parceiro.enderecos.filter(principal=True).count() == 1
        assert SocioParceiro.objects.filter(parceiro=parceiro).count() == 1
        assert SocioParceiro.objects.get(parceiro=parceiro).nome == "SOCIO TESTE"
        assert parceiro.consulta_receita_em is not None

    @patch("apps.cadastros.services.brasilapi_cnpj.urlopen")
    def test_atualizar_rejeita_parceiro_id_ausente(self, urlopen_mock, admin_client):
        client, _ = admin_client
        urlopen_mock.return_value = _mock_urlopen_response(SAMPLE_CNPJ_PAYLOAD)

        response = client.post(
            reverse("cadastros-cnpj-atualizar", args=["19131243000197"]),
            {"eh_cliente": True, "eh_fornecedor": False, "eh_parceiro": False},
            format="json",
        )

        assert response.status_code == 400
