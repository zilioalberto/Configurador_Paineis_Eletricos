import secrets
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

from apps.orcamentos.tests.test_orcamentos_api import _auth_client, _codigo_rev

from apps.cadastros.models import ParceiroComercial
from apps.catalogo.models import Produto
from apps.configurador_paineis.composicao_painel.models import (
    ComposicaoItem,
    PendenciaItem,
    SugestaoItem,
)
from core.choices import PartesPainelChoices, StatusPendenciaChoices, TensaoChoices
from core.choices.produtos import CategoriaProdutoNomeChoices
from apps.configurador_paineis.projetos.models import ProjetoConfigurador
from apps.orcamentos.models import (
    ModoConfiguradorPainelChoices,
    Orcamento,
    OrcamentoConfiguradorPainel,
    OrcamentoItem,
    OrigemItemOrcamentoChoices,
    StatusOrcamentoChoices,
    TipoRevisaoOrcamentoChoices,
)
from apps.orcamentos.services.configurador_painel import (
    adicionar_painel_configurador,
    iniciar_projeto_configurador,
)
User = get_user_model()


@pytest.fixture
def user_admin():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_superuser(
        email="orc-rev-admin@test.com",
        password=raw,
        is_active=True,
    )
    return user, raw


@pytest.fixture
def cliente():
    return ParceiroComercial.objects.create(
        documento="11222333000181",
        razao_social="Cliente Revisao LTDA",
        eh_cliente=True,
    )


@pytest.fixture
def projeto_ca(cliente, projeto_ca_minimo_kwargs):
    return ProjetoConfigurador.objects.create(
        nome="PAINEL CCM",
        codigo="11001-26",
        cliente=cliente.razao_social,
        **projeto_ca_minimo_kwargs,
    )


@pytest.mark.django_db
def test_nova_revisao_comercial_copia_itens_editaveis(user_admin, cliente):
    user, raw = user_admin
    produto = Produto.objects.create(
        codigo="REV-CAT-001",
        descricao="Produto revisado",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        custo_referencia=Decimal("100.00"),
    )
    origem = Orcamento.objects.create(
        codigo_base="Prop-01001-26",
        titulo="Origem",
        cliente=cliente,
        margem_produtos_percentual=Decimal("20.00"),
        status=StatusOrcamentoChoices.ENVIADO,
    )
    OrcamentoItem.objects.create(
        orcamento=origem,
        descricao="Item A",
        quantidade=1,
        custo_unitario=Decimal("100.00"),
        margem_percentual=Decimal("20.00"),
        preco_unitario=Decimal("120.00"),
        origem=OrigemItemOrcamentoChoices.CATALOGO,
        produto=produto,
    )
    produto.custo_referencia = Decimal("140.00")
    produto.save(update_fields=("custo_referencia",))
    client = _auth_client(user, raw)
    resp = client.post(
        reverse("erp-orcamento-nova-revisao", kwargs={"pk": origem.pk}),
        {"tipo_revisao": TipoRevisaoOrcamentoChoices.COMERCIAL},
        format="json",
    )
    assert resp.status_code == 201, resp.content
    body = resp.json()
    assert body["codigo"] == _codigo_rev("Prop-01001-26", "A")
    assert body["revisao"] == "A"
    assert body["tipo_revisao"] == TipoRevisaoOrcamentoChoices.COMERCIAL
    assert body["status"] == StatusOrcamentoChoices.RASCUNHO
    novo = Orcamento.objects.get(pk=body["id"])
    itens = list(novo.itens.all())
    assert len(itens) == 1
    assert itens[0].editavel is True
    assert itens[0].descricao == "Item A"
    assert itens[0].custo_unitario == Decimal("140.0000")
    assert itens[0].preco_unitario == Decimal("168.0000")

    origem_resp = client.get(reverse("erp-orcamento-detail", kwargs={"pk": origem.pk}))
    assert origem_resp.status_code == 200, origem_resp.content
    assert origem_resp.json()["revisoes_derivadas"][0]["id"] == body["id"]


@pytest.mark.django_db
def test_nova_revisao_tecnica_herda_e_reconfigura_painel(
    user_admin, cliente, projeto_ca, projeto_ca_minimo_kwargs
):
    user, raw = user_admin
    origem = Orcamento.objects.create(
        codigo_base="Prop-02001-26",
        titulo="Com painel",
        cliente=cliente,
        status=StatusOrcamentoChoices.ENVIADO,
    )
    painel_manter = OrcamentoConfiguradorPainel.objects.create(
        orcamento=origem,
        ordem=0,
        descricao_painel="QGBT",
        modo=ModoConfiguradorPainelChoices.ATIVO,
        projeto_configurador=projeto_ca,
    )
    projeto_reconfig = ProjetoConfigurador.objects.create(
        nome="CCM",
        codigo="11002-26",
        cliente=cliente.razao_social,
        **projeto_ca_minimo_kwargs,
    )
    painel_reconfig = OrcamentoConfiguradorPainel.objects.create(
        orcamento=origem,
        ordem=1,
        descricao_painel="CCM",
        modo=ModoConfiguradorPainelChoices.ATIVO,
        projeto_configurador=projeto_reconfig,
    )
    OrcamentoItem.objects.create(
        orcamento=origem,
        configurador_painel=painel_manter,
        descricao="[QGBT] Disjuntor",
        quantidade=1,
        preco_unitario=50,
        origem=OrigemItemOrcamentoChoices.CONFIGURADOR,
        editavel=True,
    )

    client = _auth_client(user, raw)
    resp = client.post(
        reverse("erp-orcamento-nova-revisao", kwargs={"pk": origem.pk}),
        {
            "tipo_revisao": TipoRevisaoOrcamentoChoices.TECNICA,
            "paineis_reconfigurar": [str(painel_reconfig.id)],
        },
        format="json",
    )
    assert resp.status_code == 201, resp.content
    novo = Orcamento.objects.get(pk=resp.json()["id"])
    paineis = list(novo.configuradores_painel.order_by("ordem"))
    assert len(paineis) == 2
    assert paineis[0].modo == ModoConfiguradorPainelChoices.HERANCA_HISTORICA
    assert paineis[1].modo == ModoConfiguradorPainelChoices.ATIVO
    assert paineis[1].projeto_configurador_id is None
    assert paineis[1].projeto_configurador_origem_id == projeto_reconfig.id
    itens_herdados = OrcamentoItem.objects.filter(
        orcamento=novo,
        origem=OrigemItemOrcamentoChoices.HERANCA_REVISAO,
    )
    assert itens_herdados.count() == 1
    assert itens_herdados.first().editavel is False


@pytest.mark.django_db
def test_adicionar_painel_preenche_cliente(user_admin, cliente, projeto_ca_minimo_kwargs):
    user, raw = user_admin
    orc = Orcamento.objects.create(
        codigo_base="Prop-03001-26",
        titulo="Config",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    vinculo = adicionar_painel_configurador(
        orc,
        descricao_painel="Painel 1",
        usuario=user,
    )
    assert not vinculo.projeto_configurador_id
    vinculo = iniciar_projeto_configurador(orc, vinculo, usuario=user)
    assert vinculo.projeto_configurador_id
    assert vinculo.projeto_configurador.cliente == cliente.razao_social.upper()


@pytest.mark.django_db
def test_iniciar_configurador_em_painel_ativo_sem_projeto(
    user_admin, cliente, projeto_ca_minimo_kwargs
):
    user, raw = user_admin
    orc = Orcamento.objects.create(
        codigo_base="Prop-06001-26",
        titulo="Iniciar",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    vinculo = OrcamentoConfiguradorPainel.objects.create(
        orcamento=orc,
        ordem=0,
        descricao_painel="CCM reconfig",
        modo=ModoConfiguradorPainelChoices.ATIVO,
    )
    client = _auth_client(user, raw)
    url = reverse(
        "erp-orcamento-iniciar-configurador",
        kwargs={"pk": orc.pk, "vinculo_id": vinculo.pk},
    )
    resp = client.post(url, format="json")
    assert resp.status_code == 200, resp.content
    vinculo.refresh_from_db()
    assert vinculo.projeto_configurador_id
    assert vinculo.projeto_configurador.cliente == cliente.razao_social.upper()
    assert vinculo.projeto_configurador.codigo == "CONF-06001-26"


@pytest.mark.django_db
def test_sincronizar_composicao_cria_itens(user_admin, cliente, projeto_ca):
    user, raw = user_admin
    produto = Produto.objects.create(
        codigo="SYNC-001",
        descricao="Contator",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        custo_referencia=Decimal("80.00"),
    )
    ComposicaoItem.objects.create(
        projeto=projeto_ca,
        produto=produto,
        parte_painel="COMANDO",
        categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
        quantidade=Decimal("2"),
    )
    orc = Orcamento.objects.create(
        codigo_base="Prop-04001-26",
        titulo="Sync",
        cliente=cliente,
        margem_produtos_percentual=Decimal("10"),
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    vinculo = OrcamentoConfiguradorPainel.objects.create(
        orcamento=orc,
        ordem=0,
        descricao_painel="CCM",
        modo=ModoConfiguradorPainelChoices.ATIVO,
        projeto_configurador=projeto_ca,
    )
    client = _auth_client(user, raw)
    url = reverse(
        "erp-orcamento-sincronizar-composicao",
        kwargs={"pk": orc.pk, "vinculo_id": vinculo.pk},
    )
    resp = client.post(url, format="json")
    assert resp.status_code == 200, resp.content
    itens = OrcamentoItem.objects.filter(orcamento=orc, origem=OrigemItemOrcamentoChoices.CONFIGURADOR)
    assert itens.count() == 1
    item = itens.get()
    assert item.quantidade == Decimal("2")
    assert item.descricao == produto.descricao
    assert item.configurador_painel_id == vinculo.id
    detalhe = client.get(reverse("erp-orcamento-detail", kwargs={"pk": orc.pk}))
    assert detalhe.status_code == 200
    item_api = detalhe.json()["itens"][0]
    assert item_api["descricao"] == produto.descricao
    assert item_api["painel_ref"] == "P1"
    assert item.preco_unitario == Decimal("88.0000")


@pytest.mark.django_db
def test_sincronizar_bloqueado_com_pendencias_abertas(user_admin, cliente, projeto_ca):
    user, raw = user_admin
    produto = Produto.objects.create(
        codigo="SYNC-PEND-001",
        descricao="Item aprovado",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        custo_referencia=Decimal("10.00"),
    )
    ComposicaoItem.objects.create(
        projeto=projeto_ca,
        produto=produto,
        parte_painel="COMANDO",
        categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
        quantidade=Decimal("1"),
    )
    PendenciaItem.objects.create(
        projeto=projeto_ca,
        parte_painel=PartesPainelChoices.COMANDO,
        categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
        descricao="Falta definir proteção",
        status=StatusPendenciaChoices.ABERTA,
    )
    orc = Orcamento.objects.create(
        codigo_base="Prop-07001-26",
        titulo="Pendências",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    vinculo = OrcamentoConfiguradorPainel.objects.create(
        orcamento=orc,
        ordem=0,
        descricao_painel="CCM",
        modo=ModoConfiguradorPainelChoices.ATIVO,
        projeto_configurador=projeto_ca,
    )
    client = _auth_client(user, raw)
    url = reverse(
        "erp-orcamento-sincronizar-composicao",
        kwargs={"pk": orc.pk, "vinculo_id": vinculo.pk},
    )
    resp = client.post(url, format="json")
    assert resp.status_code == 400, resp.content
    assert "pendência" in resp.json()["detail"].lower()
    assert OrcamentoItem.objects.filter(orcamento=orc).count() == 0


@pytest.mark.django_db
def test_sincronizar_bloqueado_com_sugestoes_pendentes(user_admin, cliente, projeto_ca):
    user, raw = user_admin
    produto = Produto.objects.create(
        codigo="SYNC-SUG-001",
        descricao="Contator pendente",
        categoria=CategoriaProdutoNomeChoices.OUTROS,
        custo_referencia=Decimal("10.00"),
    )
    SugestaoItem.objects.create(
        projeto=projeto_ca,
        produto=produto,
        parte_painel=PartesPainelChoices.COMANDO,
        categoria_produto=CategoriaProdutoNomeChoices.OUTROS,
        quantidade=Decimal("1"),
    )
    orc = Orcamento.objects.create(
        codigo_base="Prop-08001-26",
        titulo="Sugestões pendentes",
        cliente=cliente,
        status=StatusOrcamentoChoices.RASCUNHO,
    )
    vinculo = OrcamentoConfiguradorPainel.objects.create(
        orcamento=orc,
        ordem=0,
        descricao_painel="CCM",
        modo=ModoConfiguradorPainelChoices.ATIVO,
        projeto_configurador=projeto_ca,
    )
    client = _auth_client(user, raw)
    url = reverse(
        "erp-orcamento-sincronizar-composicao",
        kwargs={"pk": orc.pk, "vinculo_id": vinculo.pk},
    )
    resp = client.post(url, format="json")
    assert resp.status_code == 400, resp.content
    assert "sugest" in resp.json()["detail"].lower()
    assert OrcamentoItem.objects.filter(orcamento=orc).count() == 0
