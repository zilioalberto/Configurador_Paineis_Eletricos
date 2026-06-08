from decimal import Decimal
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.configurador_paineis.cargas.models import Carga, CargaMotor, CargaResistencia
from core.choices import NumeroFasesChoices, TensaoChoices, TipoCargaChoices
from core.choices.cargas import TipoAcionamentoResistenciaChoices
from core.choices.usuarios import TipoUsuarioChoices
from apps.catalogo.models import (
    EspecificacaoCanaleta,
    EspecificacaoMiniDisjuntor,
    EspecificacaoPainel,
    Produto,
)
from apps.configurador_paineis.composicao_painel.models import ComposicaoItem
from apps.configurador_paineis.dimensionamento.models import (
    DimensionamentoCircuitoAlimentacaoGeral,
    DimensionamentoCircuitoCarga,
    ResumoDimensionamento,
)
from core.choices.paineis import MaterialPainelChoices, PartesPainelChoices, TipoInstalacaoPainelChoices, TipoPainelCatalogoChoices
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    CurvaDisparoMiniDisjuntorChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
)
from apps.configurador_paineis.dimensionamento.services import calcular_e_salvar_dimensionamento_basico
from apps.configurador_paineis.dimensionamento.services.circuitos import calcular_e_salvar_circuitos_cargas

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
@patch("apps.configurador_paineis.dimensionamento.api.views.calcular_e_salvar_dimensionamento_basico")
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
@patch("apps.configurador_paineis.dimensionamento.api.views.registrar_evento_projeto")
@patch("apps.configurador_paineis.dimensionamento.api.views.calcular_e_salvar_dimensionamento_basico")
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
def test_get_dimensionamento_sincroniza_circuitos_para_nova_carga_quando_resumo_ja_existia(
    admin_client, criar_projeto
):
    """
    Se o resumo já foi criado antes de uma nova carga (ex.: modelo aplicado depois da
    primeira visita ao dimensionamento), o GET deve recalcular circuitos para todas as cargas.
    """
    client, _ = admin_client
    projeto = criar_projeto(nome="DimSync", codigo="20008-26", tensao_nominal=TensaoChoices.V380)
    projeto.numero_fases = NumeroFasesChoices.TRIFASICO
    projeto.possui_neutro = True
    projeto.possui_terra = True
    projeto.save(update_fields=["numero_fases", "possui_neutro", "possui_terra"])

    carga_m = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="MOTOR",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=1,
    )
    CargaMotor.objects.create(
        carga=carga_m,
        potencia_corrente_valor="10.00",
        potencia_corrente_unidade="A",
        tensao_motor=380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    calcular_e_salvar_dimensionamento_basico(projeto)
    assert DimensionamentoCircuitoCarga.objects.filter(projeto=projeto).count() == 1

    carga_r = Carga.objects.create(
        projeto=projeto,
        tag="R10",
        descricao="RESISTENCIA TRIFASICA 1KW",
        tipo=TipoCargaChoices.RESISTENCIA,
        quantidade=1,
    )
    CargaResistencia.objects.create(
        carga=carga_r,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        potencia_kw=Decimal("1.000"),
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
    )
    assert not DimensionamentoCircuitoCarga.objects.filter(carga=carga_r).exists()

    url = reverse("dimensionamento-por-projeto", kwargs={"projeto_id": projeto.id})
    response = client.get(url)
    assert response.status_code == 200
    assert DimensionamentoCircuitoCarga.objects.filter(carga=carga_r).exists()
    tags = {x["carga_tag"] for x in response.data["circuitos_carga"]}
    assert "R10" in tags


@pytest.mark.django_db
def test_get_dimensionamento_inclui_correntes_por_fase(admin_client, criar_projeto):
    client, _ = admin_client
    projeto = criar_projeto(nome="DimFases", codigo="20009-26", tensao_nominal=TensaoChoices.V380)
    projeto.numero_fases = NumeroFasesChoices.TRIFASICO
    projeto.fator_demanda = Decimal("1.00")
    projeto.save(update_fields=["numero_fases", "fator_demanda"])

    carga_mono = Carga.objects.create(
        projeto=projeto,
        tag="R01",
        descricao="RES MONO",
        tipo=TipoCargaChoices.RESISTENCIA,
        quantidade=3,
    )
    CargaResistencia.objects.create(
        carga=carga_mono,
        numero_fases=NumeroFasesChoices.MONOFASICO,
        tensao_resistencia=TensaoChoices.V220,
        potencia_kw=Decimal("2.200"),
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
    )

    carga_tri = Carga.objects.create(
        projeto=projeto,
        tag="M01",
        descricao="MOTOR TRI",
        tipo=TipoCargaChoices.MOTOR,
        quantidade=2,
    )
    CargaMotor.objects.create(
        carga=carga_tri,
        potencia_corrente_valor="6.00",
        potencia_corrente_unidade="A",
        tensao_motor=380,
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )

    calcular_e_salvar_dimensionamento_basico(projeto)
    url = reverse("dimensionamento-por-projeto", kwargs={"projeto_id": projeto.id})
    response = client.get(url)

    assert response.status_code == 200
    assert response.data["correntes_por_fase_painel_a"] == ["22.00", "22.00", "22.00"]
    assert response.data["corrente_total_painel_a"] == "22.00"


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
    assert circ2.id == circ.id
    assert circ2.condutores_aprovado is True
    ag = DimensionamentoCircuitoAlimentacaoGeral.objects.get(projeto=projeto)
    assert ag.condutores_aprovado is True
    resumo.refresh_from_db()
    assert resumo.condutores_revisao_confirmada is True


@pytest.mark.django_db
def test_patch_mecanico_salva_escolhas(admin_client, criar_projeto):
    client, _ = admin_client
    projeto = criar_projeto(nome="MecApi", codigo="20010-26")

    prod_comp = Produto.objects.create(
        codigo="MD-PATCH",
        descricao="Mini patch",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        largura_mm=Decimal("18"),
        altura_mm=Decimal("90"),
        profundidade_mm=Decimal("70"),
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=prod_comp,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P1,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_comp,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
    )

    prod_can = Produto.objects.create(
        codigo="CAN-PATCH",
        descricao="Canaleta patch",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("40"),
        altura_mm=Decimal("40"),
    )
    prod_painel = Produto.objects.create(
        codigo="PAINEL-PATCH",
        descricao="Painel patch",
        categoria=CategoriaProdutoNomeChoices.PAINEL,
        largura_mm=Decimal("500"),
        altura_mm=Decimal("450"),
        profundidade_mm=Decimal("200"),
    )
    EspecificacaoPainel.objects.create(
        produto=prod_painel,
        tipo_painel=TipoPainelCatalogoChoices.CAIXA_METALICA,
        tipo_instalacao=TipoInstalacaoPainelChoices.SOBREPOR,
        material=MaterialPainelChoices.ACO_CARBONO,
        placa_largura_util_mm=Decimal("450"),
        placa_altura_util_mm=Decimal("450"),
    )

    url = reverse("configurador-dimensionamento-mecanico", kwargs={"projeto_id": projeto.id})
    post_resp = client.post(url, {}, format="json")
    assert post_resp.status_code == 200

    patch_resp = client.patch(
        url,
        {
            "painel_produto_id": str(prod_painel.id),
            "canaleta_produto_id": str(prod_can.id),
            "canaletas_verticais": 2,
            "faixas_horizontais": 3,
        },
        format="json",
    )
    assert patch_resp.status_code == 200, patch_resp.content
    assert patch_resp.data["painel_escolhido"]["produto_codigo"] == "PAINEL-PATCH"
    assert patch_resp.data["canaleta_escolhida"]["produto_codigo"] == "CAN-PATCH"
    assert patch_resp.data["canaletas_verticais"] == 2
    assert patch_resp.data["faixas_horizontais"] == 3

    resumo = ResumoDimensionamento.objects.get(projeto=projeto)
    assert resumo.largura_painel_mm == 450
    assert resumo.altura_painel_mm == 450


@pytest.mark.django_db
def test_patch_mecanico_aceita_disposicao_com_id_reserva_disjuntor_geral(admin_client, criar_projeto):
    from core.choices.paineis import TipoDisjuntorGeralChoices

    client, _ = admin_client
    projeto = criar_projeto(
        nome="MecReserva",
        codigo="20012-26",
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.MINIDISJUNTOR,
    )

    prod_can = Produto.objects.create(
        codigo="CAN-RES",
        descricao="Canaleta res",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("30"),
        altura_mm=Decimal("50"),
    )
    prod_painel = Produto.objects.create(
        codigo="PAINEL-RES",
        descricao="Painel res",
        categoria=CategoriaProdutoNomeChoices.PAINEL,
        largura_mm=Decimal("500"),
        altura_mm=Decimal("450"),
        profundidade_mm=Decimal("200"),
    )
    EspecificacaoPainel.objects.create(
        produto=prod_painel,
        tipo_painel=TipoPainelCatalogoChoices.CAIXA_METALICA,
        tipo_instalacao=TipoInstalacaoPainelChoices.SOBREPOR,
        material=MaterialPainelChoices.ACO_CARBONO,
        placa_largura_util_mm=Decimal("355"),
        placa_altura_util_mm=Decimal("355"),
    )

    url = reverse("configurador-dimensionamento-mecanico", kwargs={"projeto_id": projeto.id})
    assert client.post(url, {}, format="json").status_code == 200
    dados = client.get(url).json()
    reserva_id = "reserva-geral-MINIDISJUNTOR"
    item_reserva = next(
        (i for i in dados["itens_considerados"] if i.get("reserva_mecanica")),
        None,
    )
    assert item_reserva is not None
    assert item_reserva["composicao_item_id"] == reserva_id

    disposicao = next(
        (d for d in dados["disposicao_componentes"] if d["composicao_item_id"] == reserva_id),
        None,
    )
    assert disposicao is not None

    patch_resp = client.patch(
        url,
        {
            "painel_produto_id": str(prod_painel.id),
            "canaleta_produto_id": str(prod_can.id),
            "canaletas_verticais": 2,
            "faixas_horizontais": 2,
            "disposicao_componentes": [disposicao],
        },
        format="json",
    )
    assert patch_resp.status_code == 200, patch_resp.content


@pytest.mark.django_db
def test_get_mecanico_enriquece_canaletas_catalogo(admin_client, criar_projeto):
    """GET deve atualizar canaletas_catalogo mesmo com JSON salvo desatualizado."""
    client, _ = admin_client
    projeto = criar_projeto(nome="MecGet", codigo="20011-26")

    prod_comp = Produto.objects.create(
        codigo="MD-GET",
        descricao="Mini get",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        largura_mm=Decimal("18"),
        altura_mm=Decimal("90"),
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=prod_comp,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P1,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_comp,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
    )

    prod_can = Produto.objects.create(
        codigo="CAN-GET",
        descricao="Canaleta get",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("40"),
        altura_mm=Decimal("40"),
    )

    resumo, _ = ResumoDimensionamento.objects.get_or_create(projeto=projeto)
    resumo.detalhe_dimensionamento_mecanico = {
        "largura_zona_util_mm": 120,
        "altura_zona_util_mm": 90,
        "largura_placa_min_mm": 235,
        "altura_placa_min_mm": 185,
        "profundidade_min_mm": 110,
        "canaletas_verticais": 2,
        "faixas_horizontais": 1,
        "canaletas_catalogo": [],
        "canaleta": None,
    }
    resumo.save(update_fields=["detalhe_dimensionamento_mecanico", "atualizado_em"])

    url = reverse("configurador-dimensionamento-mecanico", kwargs={"projeto_id": projeto.id})
    get_resp = client.get(url)
    assert get_resp.status_code == 200
    assert len(get_resp.data["canaletas_catalogo"]) >= 1
    assert get_resp.data["canaletas_catalogo"][0]["produto_codigo"] == "CAN-GET"
    assert get_resp.data["canaleta"]["produto_codigo"] == "CAN-GET"
    assert len(get_resp.data["itens_considerados"]) == 1
    assert get_resp.data["itens_considerados"][0]["produto_codigo"] == "MD-GET"


@pytest.mark.django_db
def test_get_mecanico_atualiza_itens_considerados_e_disposicao(admin_client, criar_projeto):
    """GET deve recalcular componentes e posicionar no layout mesmo com JSON salvo desatualizado."""
    from apps.catalogo.models import EspecificacaoContatora
    from apps.configurador_paineis.composicao_painel.models import ComposicaoInclusaoManual
    from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
        calcular_e_salvar_dimensionamento_mecanico,
    )

    client, _ = admin_client
    projeto = criar_projeto(nome="MecGetItens", codigo="20012-26")

    prod_md = Produto.objects.create(
        codigo="MD-BASE",
        descricao="Mini base",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        largura_mm=Decimal("18"),
        altura_mm=Decimal("90"),
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=prod_md,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P1,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_md,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
    )

    prod_manual = Produto.objects.create(
        codigo="MAN-GET",
        descricao="Inclusão manual get",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        largura_mm=Decimal("45"),
        altura_mm=Decimal("90"),
    )
    EspecificacaoContatora.objects.create(
        produto=prod_manual,
        corrente_ac3_a=Decimal("12"),
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    prod_can = Produto.objects.create(
        codigo="CAN-GET2",
        descricao="Canaleta get2",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("30"),
        altura_mm=Decimal("30"),
    )

    _, detalhe_salvo = calcular_e_salvar_dimensionamento_mecanico(projeto)
    assert len(detalhe_salvo["itens_considerados"]) == 1

    ComposicaoInclusaoManual.objects.create(
        projeto=projeto,
        produto=prod_manual,
        quantidade=Decimal("1"),
    )

    url = reverse("configurador-dimensionamento-mecanico", kwargs={"projeto_id": projeto.id})
    get_resp = client.get(url)
    assert get_resp.status_code == 200

    codigos = {item["produto_codigo"] for item in get_resp.data["itens_considerados"]}
    assert "MD-BASE" in codigos
    assert "MAN-GET" in codigos
