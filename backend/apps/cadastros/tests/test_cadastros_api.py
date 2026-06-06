import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.cadastros.models import ContatoParceiro, EnderecoParceiro, ParceiroComercial
from core.choices.usuarios import TipoUsuarioChoices

User = get_user_model()


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
    raw = "cadastros-pass-12345"
    user = User.objects.create_user(
        email="cadastros-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
class TestCadastrosApi:
    def test_cria_parceiro_cliente_e_fornecedor(self, admin_client):
        client, _ = admin_client

        response = client.post(
            reverse("cadastros-parceiros-list"),
            {
                "tipo_pessoa": "PJ",
                "documento": "11222333000181",
                "razao_social": "Parceiro Teste LTDA",
                "nome_fantasia": "Parceiro Teste",
                "eh_cliente": True,
                "eh_fornecedor": True,
                "eh_parceiro": False,
            },
            format="json",
        )

        assert response.status_code == 201
        parceiro = ParceiroComercial.objects.get(documento="11222333000181")
        assert parceiro.eh_cliente is True
        assert parceiro.eh_fornecedor is True

    def test_rejeita_parceiro_sem_classificacao(self, admin_client):
        client, _ = admin_client

        response = client.post(
            reverse("cadastros-parceiros-list"),
            {
                "tipo_pessoa": "PJ",
                "documento": "11222333000181",
                "razao_social": "Sem classificacao",
            },
            format="json",
        )

        assert response.status_code == 400
        assert "classificacao" in str(response.data)

    def test_filtra_parceiros_por_fornecedor(self, admin_client):
        client, _ = admin_client
        fornecedor = ParceiroComercial.objects.create(
            documento="11111111000191",
            razao_social="Fornecedor Ativo",
            eh_fornecedor=True,
        )
        ParceiroComercial.objects.create(
            documento="22222222000182",
            razao_social="Cliente Apenas",
            eh_cliente=True,
        )

        response = client.get(reverse("cadastros-parceiros-list"), {"tipo": "fornecedor"})

        assert response.status_code == 200
        assert [item["id"] for item in response.data] == [str(fornecedor.id)]

    def test_cadastra_contato_e_endereco(self, admin_client):
        client, _ = admin_client
        parceiro = ParceiroComercial.objects.create(
            documento="34028316000103",
            razao_social="Parceiro com detalhe",
            eh_parceiro=True,
        )

        endereco = client.post(
            reverse("cadastros-enderecos-list"),
            {
                "parceiro": str(parceiro.id),
                "nome": "Matriz",
                "logradouro": "Rua Teste",
                "municipio": "Sao Paulo",
                "uf": "SP",
                "principal": True,
            },
            format="json",
        )
        contato = client.post(
            reverse("cadastros-contatos-list"),
            {
                "parceiro": str(parceiro.id),
                "nome": "Contato Principal",
                "email": "contato@example.com",
                "principal": True,
            },
            format="json",
        )

        assert endereco.status_code == 201
        assert contato.status_code == 201
        assert EnderecoParceiro.objects.filter(parceiro=parceiro).count() == 1
        assert ContatoParceiro.objects.filter(parceiro=parceiro).count() == 1

    def test_rejeita_cnpj_invalido_no_cadastro_manual(self, admin_client):
        client, _ = admin_client

        response = client.post(
            reverse("cadastros-parceiros-list"),
            {
                "tipo_pessoa": "PJ",
                "documento": "12345678000199",
                "razao_social": "CNPJ invalido",
                "eh_cliente": True,
            },
            format="json",
        )

        assert response.status_code == 400
        assert "documento" in response.data

    def test_sanitiza_razao_social_no_cadastro_manual(self, admin_client):
        client, _ = admin_client

        response = client.post(
            reverse("cadastros-parceiros-list"),
            {
                "tipo_pessoa": "PJ",
                "documento": "19131243000197",
                "razao_social": '<script>alert(1)</script>Empresa Limpa LTDA',
                "eh_cliente": True,
            },
            format="json",
        )

        assert response.status_code == 201
        parceiro = ParceiroComercial.objects.get(documento="19131243000197")
        assert "<script>" not in parceiro.razao_social
        assert "Empresa Limpa LTDA" in parceiro.razao_social
