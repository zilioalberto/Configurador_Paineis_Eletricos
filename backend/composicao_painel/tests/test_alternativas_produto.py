from decimal import Decimal
from unittest.mock import MagicMock, patch

import pytest
from django.core.exceptions import FieldError

from catalogo.models import Produto
from composicao_painel.services.alternativas_produto import (
    _corrente_referencia_sugestao,
    listar_alternativas_para_sugestao,
)
from core.choices import CategoriaProdutoNomeChoices, PartesPainelChoices, TensaoChoices
from core.choices.cargas import TipoCargaChoices
from core.choices.eletrica import TipoCorrenteChoices
from core.choices.produtos import UnidadeMedidaChoices


@pytest.mark.django_db
def test_corrente_referencia_usa_campo_da_sugestao():
    s = MagicMock()
    s.corrente_referencia_a = Decimal("12.5")
    s.carga = None
    assert _corrente_referencia_sugestao(s) == Decimal("12.5")


@pytest.mark.django_db
def test_corrente_referencia_motor_usa_corrente_calculada(criar_projeto, criar_carga_motor):
    from cargas.models import Carga
    from composicao_painel.models import SugestaoItem

    projeto = criar_projeto(nome="Alt", codigo="99001-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="ALT-P",
        descricao="P",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        corrente_referencia_a=None,
        quantidade=Decimal("1"),
        ordem=1,
    )
    sugestao.carga.refresh_from_db()
    ref = _corrente_referencia_sugestao(sugestao)
    assert ref is not None
    assert ref == sugestao.carga.motor.corrente_calculada_a


@pytest.mark.django_db
def test_listar_alternativas_categoria_nao_suportada_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.PLC
    assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_contatora_sem_carga_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.CONTATORA
    s.carga_id = None
    s.projeto = MagicMock()
    assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_contatora_sem_tensao_comando_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.CONTATORA
    s.carga_id = "x"
    s.carga = MagicMock()
    s.carga.tipo = TipoCargaChoices.MOTOR
    s.projeto = MagicMock()
    s.projeto.tensao_comando = None
    s.projeto.tipo_corrente_comando = "CC"
    assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_contatora_sem_corrente_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.CONTATORA
    s.carga_id = "x"
    s.carga = MagicMock()
    s.carga.tipo = TipoCargaChoices.MOTOR
    s.projeto = MagicMock()
    s.projeto.tensao_comando = 24
    s.projeto.tipo_corrente_comando = "CC"
    with patch(
        "composicao_painel.services.alternativas_produto._corrente_referencia_sugestao",
        return_value=None,
    ):
        assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_motor_sem_corrente_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR
    with patch(
        "composicao_painel.services.alternativas_produto._corrente_referencia_sugestao",
        return_value=None,
    ):
        assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_seccionadora_sem_corrente_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.SECCIONADORA
    s.corrente_referencia_a = None
    with patch(
        "composicao_painel.services.alternativas_produto._corrente_referencia_sugestao",
        return_value=None,
    ):
        assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_caixa_moldada_sem_corrente_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA
    s.corrente_referencia_a = None
    assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_caixa_moldada_field_error_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA
    s.corrente_referencia_a = Decimal("10")
    s.produto_id = None
    s.carga_id = None
    with patch(
        "composicao_painel.services.alternativas_produto.selecionar_disjuntores_caixa_moldada",
        side_effect=FieldError("test"),
    ):
        assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_contatora_delega_selecionar_contatoras():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.CONTATORA
    s.carga_id = 1
    s.carga = MagicMock()
    s.carga.tipo = TipoCargaChoices.MOTOR
    s.projeto = MagicMock()
    s.projeto.tensao_comando = TensaoChoices.V24
    s.projeto.tipo_corrente_comando = TipoCorrenteChoices.CC
    s.produto_id = None
    fake_qs = Produto.objects.none()
    with patch(
        "composicao_painel.services.alternativas_produto._corrente_referencia_sugestao",
        return_value=Decimal("7"),
    ):
        with patch(
            "composicao_painel.services.alternativas_produto.selecionar_contatoras",
            return_value=fake_qs,
        ) as m_sel:
            assert listar_alternativas_para_sugestao(s) is fake_qs
    m_sel.assert_called_once()
    call_kw = m_sel.call_args.kwargs
    assert call_kw["tipo_carga"] == TipoCargaChoices.MOTOR
    assert call_kw["corrente_nominal"] == Decimal("7")
    assert call_kw["niveis"] == 0


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_motor_delega_selecionar():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR
    s.carga_id = 1
    s.carga = MagicMock()
    s.carga.tipo = TipoCargaChoices.MOTOR
    fake_qs = Produto.objects.none()
    with patch(
        "composicao_painel.services.alternativas_produto._corrente_referencia_sugestao",
        return_value=Decimal("12"),
    ):
        with patch(
            "composicao_painel.services.alternativas_produto.selecionar_disjuntores_motor",
            return_value=fake_qs,
        ) as m_sel:
            assert listar_alternativas_para_sugestao(s) is fake_qs
    assert m_sel.call_args.kwargs["niveis"] == 0


@pytest.mark.django_db
def test_listar_alternativas_seccionadora_delega_selecionar():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.SECCIONADORA
    s.corrente_referencia_a = Decimal("20")
    s.produto_id = None
    fake_qs = Produto.objects.none()
    with patch(
        "composicao_painel.services.alternativas_produto.selecionar_seccionadoras",
        return_value=fake_qs,
    ) as m_sel:
        assert listar_alternativas_para_sugestao(s) is fake_qs
    assert m_sel.call_args.kwargs["corrente_nominal"] == Decimal("20")


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_cm_sucesso():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA
    s.corrente_referencia_a = Decimal("32")
    s.produto_id = None
    fake_qs = Produto.objects.none()
    with patch(
        "composicao_painel.services.alternativas_produto.selecionar_disjuntores_caixa_moldada",
        return_value=fake_qs,
    ) as m_sel:
        assert listar_alternativas_para_sugestao(s) is fake_qs
    assert m_sel.call_args.kwargs["corrente_nominal"] == Decimal("32")
