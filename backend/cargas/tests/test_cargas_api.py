"""Testes HTTP da API de cargas e modelos (cobertura Sonar em views/serializers)."""

import uuid
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from cargas.models import Carga, CargaModelo
from cargas.api.serializers import CargaModeloSerializer
from core.choices import TensaoChoices
from core.choices.cargas import TipoCargaChoices
from core.choices.eletrica import TipoSinalChoices
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
    raw = "cargas-api-secret-12345"
    user = User.objects.create_user(
        email="cargas-api-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    return _auth_client(user.email, raw), user


def _payload_carga_outro(projeto_id):
    return {
        "projeto": str(projeto_id),
        "tag": "O99",
        "descricao": "Carga outro",
        "tipo": TipoCargaChoices.OUTRO,
        "quantidade": 1,
        "local_instalacao": "",
        "observacoes": "",
        "exige_protecao": True,
        "exige_seccionamento": False,
        "exige_comando": False,
        "quantidade_entradas_digitais": 0,
        "quantidade_entradas_analogicas": 0,
        "quantidade_saidas_digitais": 0,
        "quantidade_saidas_analogicas": 0,
        "quantidade_entradas_rapidas": 0,
        "ativo": True,
    }


@pytest.mark.django_db
@patch("cargas.api.views.reprocessar_composicao_painel_para_carga")
class TestCargaViewSet:
    def test_list_sem_filtro(self, _mock_reproc, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="L", codigo="10001-26", tensao_nominal=TensaoChoices.V380)
        Carga.objects.create(
            projeto=projeto,
            tag="O01",
            descricao="X",
            tipo=TipoCargaChoices.OUTRO,
            quantidade=1,
        )
        url = reverse("cargas-list")
        r = client.get(url)
        assert r.status_code == 200
        assert len(r.data) >= 1

    def test_list_filtra_por_projeto(self, _mock_reproc, admin_client, criar_projeto):
        client, _ = admin_client
        p1 = criar_projeto(nome="A", codigo="10002-26", tensao_nominal=TensaoChoices.V380)
        p2 = criar_projeto(nome="B", codigo="10003-26", tensao_nominal=TensaoChoices.V380)
        Carga.objects.create(
            projeto=p1, tag="O02", descricao="A", tipo=TipoCargaChoices.OUTRO, quantidade=1
        )
        Carga.objects.create(
            projeto=p2, tag="O03", descricao="B", tipo=TipoCargaChoices.OUTRO, quantidade=1
        )
        url = reverse("cargas-list")
        r = client.get(f"{url}?projeto={p1.id}")
        assert r.status_code == 200
        tags_p1 = {row["tag"] for row in r.data if str(row["projeto"]) == str(p1.id)}
        assert "O02" in tags_p1
        assert "O03" not in tags_p1

    def test_create_update_destroy(self, mock_reproc, admin_client, criar_projeto):
        client, _ = admin_client
        projeto = criar_projeto(nome="C", codigo="10004-26", tensao_nominal=TensaoChoices.V380)
        url = reverse("cargas-list")
        body = _payload_carga_outro(projeto.id)
        r = client.post(url, body, format="json")
        assert r.status_code == 201
        cid = r.data["id"]
        mock_reproc.assert_called()

        detail = reverse("cargas-detail", kwargs={"pk": cid})
        r2 = client.patch(detail, {"descricao": "Atualizado"}, format="json")
        assert r2.status_code == 200
        assert r2.data["descricao"] == "ATUALIZADO"

        r3 = client.delete(detail)
        assert r3.status_code == 204


@pytest.mark.django_db
class TestCargaModeloApi:
    def test_get_post_put_delete_modelo(self, admin_client):
        client, _ = admin_client
        url = reverse("cargas-modelos")
        r = client.get(url)
        assert r.status_code == 200

        r2 = client.get(url, {"tipo": TipoCargaChoices.MOTOR, "q": "bomba"})
        assert r2.status_code == 200

        nome = f"Modelo API {uuid.uuid4().hex[:10]}"
        body = {
            "nome": nome,
            "tipo": TipoCargaChoices.MOTOR,
            "payload": {"quantidade": 1},
            "ativo": True,
        }
        r3 = client.post(url, body, format="json")
        assert r3.status_code == 201
        mid = r3.data["id"]

        detail = reverse("cargas-modelos-detail", kwargs={"pk": mid})
        r4 = client.put(
            detail,
            {**body, "nome": nome + " alt", "payload": {"quantidade": 2}},
            format="json",
        )
        assert r4.status_code == 200

        r5 = client.delete(detail)
        assert r5.status_code == 204
        assert not CargaModelo.objects.filter(pk=mid).exists()


@pytest.mark.django_db
@patch("cargas.api.views.reprocessar_composicao_painel_para_carga")
def test_create_sensor_analogico_sem_tipo_sinal_analogico_400(
    _mock_reproc, admin_client, criar_projeto
):
    client, _ = admin_client
    projeto = criar_projeto(nome="S", codigo="10006-26", tensao_nominal=TensaoChoices.V380)
    url = reverse("cargas-list")
    body = {
        **_payload_carga_outro(projeto.id),
        "tag": "S01",
        "descricao": "Sensor",
        "tipo": TipoCargaChoices.SENSOR,
        "sensor": {
            "tipo_sensor": "INDUTIVO",
            "tipo_sinal": TipoSinalChoices.ANALOGICO,
            "tipo_sinal_analogico": "",
            "pnp": False,
            "npn": False,
            "normalmente_aberto": False,
            "normalmente_fechado": False,
        },
    }
    r = client.post(url, body, format="json")
    assert r.status_code == 400
    assert "sensor" in r.data


@pytest.mark.django_db
def test_carga_modelo_serializer_limpa_payload_por_tipo():
    ser = CargaModeloSerializer(
        data={
            "nome": "Modelo Limpo",
            "tipo": TipoCargaChoices.MOTOR,
            "payload": {
                "quantidade": 2,
                "motor": {"tipo_partida": "DIRETA"},
                "sensor": {"tipo_sinal": TipoSinalChoices.DIGITAL},
            },
            "ativo": True,
        }
    )
    assert ser.is_valid(), ser.errors
    assert ser.validated_data["payload"] == {
        "quantidade": 2,
        "motor": {"tipo_partida": "DIRETA"},
    }


@pytest.mark.django_db
def test_carga_modelo_str(admin_client):
    _, user = admin_client
    modelo = CargaModelo.objects.create(
        nome="Modelo String",
        tipo=TipoCargaChoices.OUTRO,
        payload={},
        criado_por=user,
        atualizado_por=user,
    )
    assert str(modelo) == "Modelo String"


@pytest.mark.django_db
@patch("cargas.api.views.reprocessar_composicao_painel_para_carga")
def test_create_motor_soft_starter_com_tensao_diferente_retorna_mensagem_amigavel(
    _mock_reproc, admin_client, criar_projeto
):
    client, _ = admin_client
    projeto = criar_projeto(
        nome="M", codigo="10007-26", tensao_nominal=TensaoChoices.V380
    )
    url = reverse("cargas-list")
    body = {
        **_payload_carga_outro(projeto.id),
        "tag": "M02",
        "descricao": "Motor com tensão inválida",
        "tipo": TipoCargaChoices.MOTOR,
        "motor": {
            "potencia_corrente_valor": "1.00",
            "potencia_corrente_unidade": "CV",
            "tipo_partida": "SOFT_STARTER",
            "numero_fases": 3,
            "tensao_motor": 220,
        },
    }
    r = client.post(url, body, format="json")
    assert r.status_code == 400
    assert "motor" in r.data
    assert "tensao_motor" in r.data["motor"]
    assert "A tensão do motor deve ser igual à tensão do projeto" in str(
        r.data["motor"]["tensao_motor"]
    )


@pytest.mark.django_db
@patch("cargas.api.views.reprocessar_composicao_painel_para_carga")
def test_create_resistencia_com_tensao_diferente_retorna_mensagem_amigavel(
    _mock_reproc, admin_client, criar_projeto
):
    client, _ = admin_client
    projeto = criar_projeto(
        nome="R", codigo="10008-26", tensao_nominal=TensaoChoices.V380
    )
    url = reverse("cargas-list")
    body = {
        **_payload_carga_outro(projeto.id),
        "tag": "R01",
        "descricao": "Resistência com tensão inválida",
        "tipo": TipoCargaChoices.RESISTENCIA,
        "resistencia": {
            "numero_fases": 3,
            "tensao_resistencia": 220,
            "potencia_kw": "1.500",
        },
    }
    r = client.post(url, body, format="json")
    assert r.status_code == 400
    assert "resistencia" in r.data
    assert "tensao_resistencia" in r.data["resistencia"]
    assert "A tensão da resistência deve ser igual à tensão do projeto" in str(
        r.data["resistencia"]["tensao_resistencia"]
    )


