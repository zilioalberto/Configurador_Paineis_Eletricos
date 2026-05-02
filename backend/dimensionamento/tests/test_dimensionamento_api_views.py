from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from cargas.models import Carga, CargaMotor
from core.choices import NumeroFasesChoices, TensaoChoices, TipoCargaChoices
from core.choices.usuarios import TipoUsuarioChoices
from dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from dimensionamento.services import calcular_e_salvar_dimensionamento_basico
from dimensionamento.services.circuitos import calcular_e_salvar_circuitos_cargas

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
    raw = "dimensionamento-api-secret-12345"
    user = User.objects.create_user(
        email="dimensionamento-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    return _auth_client(user.email, raw), user


@pytest.mark.django_db
@patch("dimensionamento.api.views.calcular_e_salvar_dimensionamento_basico")
def test_get_dimensionamento_cria_e_calcula_primeira_vez(mock_calc, admin_client, criar_projeto):
    client, _ = admin_client
    projeto = criar_projeto(nome="Dim", codigo="20001-26", tensao_nominal=TensaoChoices.V380)
    resumo = ResumoDimensionamento.objects.create(projeto=projeto, corrente_total_painel_a=0)
    mock_calc.return_value = resumo

    ResumoDimensionamento.objects.filter(pk=resumo.pk).delete()
    url = reverse("dimensionamento-por-projeto", kwargs={"projeto_id": projeto.id})
    response = client.get(url)

    assert response.status_code == 200
    assert "corrente_total_painel_a" in response.data
    mock_calc.assert_called_once_with(projeto)


@pytest.mark.django_db
@patch("dimensionamento.api.views.registrar_evento_projeto")
@patch("dimensionamento.api.views.calcular_e_salvar_dimensionamento_basico")
def test_post_recalcular_dimensionamento_registra_evento(
    mock_calc, mock_evento, admin_client, criar_projeto
):
    client, user = admin_client
    projeto = criar_projeto(nome="Dim2", codigo="20002-26", tensao_nominal=TensaoChoices.V380)
    resumo = ResumoDimensionamento.objects.create(
        projeto=projeto,
        corrente_total_painel_a=12.5,
    )
    mock_calc.return_value = resumo
    url = reverse("dimensionamento-recalcular", kwargs={"projeto_id": projeto.id})

    response = client.post(url, {}, format="json")

    assert response.status_code == 200
    assert str(response.data["projeto"]) == str(projeto.id)
    mock_calc.assert_called_once_with(projeto)
    mock_evento.assert_called_once()
    kwargs = mock_evento.call_args.kwargs
    assert kwargs["projeto"] == projeto
    assert kwargs["usuario"] == user


@pytest.mark.django_db
def test_get_dimensionamento_inclui_circuitos_e_tabela(admin_client, criar_projeto):
    client, _ = admin_client
    projeto = criar_projeto(nome="Dim3", codigo="20003-26", tensao_nominal=TensaoChoices.V380)
    calcular_e_salvar_dimensionamento_basico(projeto)
    url = reverse("dimensionamento-por-projeto", kwargs={"projeto_id": projeto.id})
    response = client.get(url)
    assert response.status_code == 200
    assert "circuitos_carga" in response.data
    assert "secoes_comerciais_mm2" in response.data
    assert "condutores_tabela_referencia" in response.data
    assert response.data.get("condutores_revisao_confirmada") is False


@pytest.mark.django_db
def test_patch_condutores_confirma_revisao(admin_client, criar_projeto):
    client, _ = admin_client
    projeto = criar_projeto(nome="Dim4", codigo="20004-26", tensao_nominal=TensaoChoices.V380)
    calcular_e_salvar_dimensionamento_basico(projeto)
    url = reverse("dimensionamento-condutores", kwargs={"projeto_id": projeto.id})
    response = client.patch(url, {"confirmar_revisao": True}, format="json")
    assert response.status_code == 200
    assert response.data.get("condutores_revisao_confirmada") is True


@pytest.mark.django_db
def test_patch_condutores_aprovado_por_circuito(admin_client, criar_projeto):
    client, _ = admin_client
    projeto = criar_projeto(nome="Dim5", codigo="20005-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="MOTOR",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )
    CargaMotor.objects.create(
        carga=carga,
        potencia_corrente_valor="10.00",
        potencia_corrente_unidade="A",
        tensao_motor=380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    calcular_e_salvar_circuitos_cargas(projeto)
    circ = DimensionamentoCircuitoCarga.objects.get(carga=carga)
    assert circ.condutores_aprovado is False

    url = reverse("dimensionamento-condutores", kwargs={"projeto_id": projeto.id})
    response = client.patch(
        url,
        {"circuitos": [{"id": str(circ.id), "condutores_aprovado": True}]},
        format="json",
    )
    assert response.status_code == 200
    row = next(x for x in response.data["circuitos_carga"] if x["id"] == str(circ.id))
    assert row["condutores_aprovado"] is True

    resumo = ResumoDimensionamento.objects.get(projeto=projeto)
    resumo.condutores_revisao_confirmada = True
    resumo.save(update_fields=["condutores_revisao_confirmada"])

    response2 = client.patch(
        url,
        {"circuitos": [{"id": str(circ.id), "condutores_aprovado": False}]},
        format="json",
    )
    assert response2.status_code == 200
    assert response2.data.get("condutores_revisao_confirmada") is False


@pytest.mark.django_db
def test_patch_aprovacoes_individuais_sem_confirmar_revisao_confirma_quando_tudo_aprovado(
    admin_client, criar_projeto
):
    """Aprovar linha a linha + AG deve marcar revisão sem `confirmar_revisao: true`."""
    client, _ = admin_client
    projeto = criar_projeto(nome="Dim6", codigo="20006-26", tensao_nominal=TensaoChoices.V380)
    projeto.numero_fases = NumeroFasesChoices.TRIFASICO
    projeto.possui_neutro = True
    projeto.possui_terra = True
    projeto.save(update_fields=["numero_fases", "possui_neutro", "possui_terra"])

    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="MOTOR",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )
    CargaMotor.objects.create(
        carga=carga,
        potencia_corrente_valor="10.00",
        potencia_corrente_unidade="A",
        tensao_motor=380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    calcular_e_salvar_dimensionamento_basico(projeto)
    circ = DimensionamentoCircuitoCarga.objects.get(carga=carga)
    url = reverse("dimensionamento-condutores", kwargs={"projeto_id": projeto.id})

    r1 = client.patch(
        url,
        {"circuitos": [{"id": str(circ.id), "condutores_aprovado": True}]},
        format="json",
    )
    assert r1.status_code == 200
    assert r1.data.get("condutores_revisao_confirmada") is False

    r2 = client.patch(
        url,
        {"alimentacao_geral": {"condutores_aprovado": True}},
        format="json",
    )
    assert r2.status_code == 200
    assert r2.data.get("condutores_revisao_confirmada") is True


@pytest.mark.django_db
def test_recalcular_preserva_aprovacoes_se_dimensionamento_inalterado(
    admin_client, criar_projeto
):
    client, _ = admin_client
    projeto = criar_projeto(nome="Dim7", codigo="20007-26", tensao_nominal=TensaoChoices.V380)
    projeto.numero_fases = NumeroFasesChoices.TRIFASICO
    projeto.possui_neutro = True
    projeto.possui_terra = True
    projeto.save(update_fields=["numero_fases", "possui_neutro", "possui_terra"])

    carga = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="MOTOR",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )
    CargaMotor.objects.create(
        carga=carga,
        potencia_corrente_valor="10.00",
        potencia_corrente_unidade="A",
        tensao_motor=380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    calcular_e_salvar_dimensionamento_basico(projeto)
    circ = DimensionamentoCircuitoCarga.objects.get(carga=carga)
    url = reverse("dimensionamento-condutores", kwargs={"projeto_id": projeto.id})
    client.patch(
        url,
        {"circuitos": [{"id": str(circ.id), "condutores_aprovado": True}]},
        format="json",
    )
    client.patch(
        url,
        {"alimentacao_geral": {"condutores_aprovado": True}},
        format="json",
    )
    resumo = ResumoDimensionamento.objects.get(projeto=projeto)
    assert resumo.condutores_revisao_confirmada is True

    calcular_e_salvar_dimensionamento_basico(projeto)

    circ2 = DimensionamentoCircuitoCarga.objects.get(carga=carga)
    assert circ2.id != circ.id
    assert circ2.condutores_aprovado is True
    ag = DimensionamentoCircuitoAlimentacaoGeral.objects.get(projeto=projeto)
    assert ag.condutores_aprovado is True
    resumo.refresh_from_db()
    assert resumo.condutores_revisao_confirmada is True
