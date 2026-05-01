from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock, patch

import pytest
from django.core.exceptions import FieldError

from cargas.models import Carga, CargaResistencia
from catalogo.models import EspecificacaoDisjuntorCaixaMoldada, Produto
from composicao_painel.models import SugestaoItem
from composicao_painel.services.alternativas_produto import (
    _corrente_referencia_sugestao,
    listar_alternativas_para_sugestao,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    TensaoChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoCargaChoices,
    TipoProtecaoResistenciaChoices,
)
from core.choices.eletrica import TipoCorrenteChoices
from core.choices.produtos import (
    ConfiguracaoDisparadorDisjuntorCMChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
    TipoFusivelChoices,
    UnidadeMedidaChoices,
)


@pytest.mark.django_db
def test_corrente_referencia_usa_campo_da_sugestao():
    s = MagicMock()
    s.corrente_referencia_a = Decimal("12.5")
    s.carga = None
    assert _corrente_referencia_sugestao(s) == Decimal("12.5")


@pytest.mark.django_db
def test_corrente_referencia_sem_corrente_na_sugestao_sem_carga_retorna_none():
    s = MagicMock()
    s.corrente_referencia_a = None
    s.carga = None
    assert _corrente_referencia_sugestao(s) is None


@pytest.mark.django_db
def test_corrente_referencia_motor_usa_corrente_calculada(criar_projeto, criar_carga_motor):
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
def test_corrente_referencia_resistencia_usa_corrente_calculada(criar_projeto):
    projeto = criar_projeto(nome="AltR", codigo="99002-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R1",
        descricao="RES",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("2.000"),
    )
    produto = Produto.objects.create(
        codigo="ALT-R",
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
    assert ref == carga.resistencia.corrente_calculada_a


@pytest.mark.django_db
def test_corrente_referencia_motor_sem_motor_retorna_none(criar_projeto):
    projeto = criar_projeto(nome="AltM", codigo="99003-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M0",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    produto = Produto.objects.create(
        codigo="ALT-M0",
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
    assert _corrente_referencia_sugestao(sugestao) is None


@pytest.mark.django_db
def test_corrente_referencia_outro_tipo_retorna_none(criar_projeto):
    projeto = criar_projeto(nome="AltV", codigo="99004-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="V1",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    produto = Produto.objects.create(
        codigo="ALT-V",
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
    assert _corrente_referencia_sugestao(sugestao) is None


@pytest.mark.django_db
def test_listar_alternativas_contatora_executa_seletor_real(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="Int", codigo="99100-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="INT-P",
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
    qs = listar_alternativas_para_sugestao(sugestao)
    assert not qs.exists()


@pytest.mark.django_db
def test_listar_alternativas_contatora_resistencia_executa_tipo_acionamento(criar_projeto):
    projeto = criar_projeto(nome="IntR", codigo="99101-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R1",
        descricao="R",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
        potencia_kw=Decimal("3.000"),
    )
    produto = Produto.objects.create(
        codigo="INT-R",
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
    qs = listar_alternativas_para_sugestao(sugestao)
    assert not qs.exists()


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_motor_executa_seletor_real(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IntD", codigo="99102-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M2",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="INT-DM",
        descricao="P",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        corrente_referencia_a=None,
        quantidade=Decimal("1"),
        ordem=1,
    )
    sugestao.carga.refresh_from_db()
    qs = listar_alternativas_para_sugestao(sugestao)
    assert not qs.exists()


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_motor_resistencia_protecao(criar_projeto):
    projeto = criar_projeto(nome="IntDR", codigo="99103-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="R2",
        descricao="R",
        tipo=TipoCargaChoices.RESISTENCIA,
    )
    CargaResistencia.objects.create(
        carga=carga,
        numero_fases=NumeroFasesChoices.TRIFASICO,
        tensao_resistencia=TensaoChoices.V380,
        tipo_protecao=TipoProtecaoResistenciaChoices.DISJUNTOR_MOTOR,
        tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
        potencia_kw=Decimal("1.000"),
    )
    produto = Produto.objects.create(
        codigo="INT-DMR",
        descricao="P",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        corrente_referencia_a=None,
        quantidade=Decimal("1"),
        ordem=1,
    )
    sugestao.carga.refresh_from_db()
    qs = listar_alternativas_para_sugestao(sugestao)
    assert not qs.exists()


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_motor_modo_quando_sem_especificacao(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IntDM2", codigo="99104-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M3",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="INT-DM2",
        descricao="P",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        corrente_referencia_a=None,
        quantidade=Decimal("1"),
        ordem=1,
    )
    sugestao.carga.refresh_from_db()
    qs = listar_alternativas_para_sugestao(sugestao)
    assert not qs.exists()


@pytest.mark.django_db
def test_listar_alternativas_seccionadora_executa_seletor_real(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="IntS", codigo="99105-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="INT-S",
        descricao="P",
        categoria=CategoriaProdutoNomeChoices.SECCIONADORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.SECCIONADORA,
        corrente_referencia_a=None,
        quantidade=Decimal("1"),
        ordem=1,
    )
    sugestao.carga.refresh_from_db()
    qs = listar_alternativas_para_sugestao(sugestao)
    assert not qs.exists()


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_cm_executa_seletor_real(criar_projeto):
    projeto = criar_projeto(nome="IntCM", codigo="99106-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="INT-CM",
        descricao="P",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=None,
        produto=produto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        corrente_referencia_a=Decimal("40"),
        quantidade=Decimal("1"),
        ordem=1,
    )
    qs = listar_alternativas_para_sugestao(sugestao)
    assert not qs.exists()


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
def test_listar_alternativas_rele_sobrecarga_sem_corrente_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.RELE_SOBRECARGA
    with patch(
        "composicao_painel.services.alternativas_produto._corrente_referencia_sugestao",
        return_value=None,
    ):
        assert not listar_alternativas_para_sugestao(s).exists()


@pytest.mark.django_db
def test_listar_alternativas_fusivel_sem_corrente_retorna_vazio():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.FUSIVEL
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
def test_listar_alternativas_rele_sobrecarga_delega_selecionar():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.RELE_SOBRECARGA
    s.produto_id = None
    fake_qs = Produto.objects.none()
    with patch(
        "composicao_painel.services.alternativas_produto._corrente_referencia_sugestao",
        return_value=Decimal("6"),
    ):
        with patch(
            "composicao_painel.services.alternativas_produto.selecionar_reles_sobrecarga",
            return_value=fake_qs,
        ) as m_sel:
            assert listar_alternativas_para_sugestao(s) is fake_qs
    call_kw = m_sel.call_args.kwargs
    assert call_kw["corrente_nominal"] == Decimal("6")
    assert call_kw["modo_montagem"] is None
    assert call_kw["niveis"] == 0


@pytest.mark.django_db
def test_listar_alternativas_fusivel_delega_selecionar():
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.FUSIVEL
    fake_qs = Produto.objects.none()
    with patch(
        "composicao_painel.services.alternativas_produto._corrente_referencia_sugestao",
        return_value=Decimal("8"),
    ):
        with patch(
            "composicao_painel.services.alternativas_produto.selecionar_fusiveis",
            return_value=fake_qs,
        ) as m_sel:
            assert listar_alternativas_para_sugestao(s) is fake_qs
    call_kw = m_sel.call_args.kwargs
    assert call_kw["corrente_nominal_maior_que_a"] == Decimal("8")
    assert call_kw["tipo_fusivel"] == TipoFusivelChoices.RETARDADO


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


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_cm_passa_modo_montagem_do_produto(criar_projeto):
    projeto = criar_projeto(nome="AltCM", codigo="99107-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="ALT-CM-SPEC",
        descricao="CM com spec",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoDisjuntorCaixaMoldada.objects.create(
        produto=produto,
        corrente_nominal_a=Decimal("100"),
        numero_polos=NumeroPolosChoices.P3,
        configuracao_disparador=(
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_IR_II_FIXOS
        ),
        capacidade_interrupcao_380v_ka=Decimal("50"),
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    sugestao = SugestaoItem.objects.create(
        projeto=projeto,
        carga=None,
        produto=produto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        corrente_referencia_a=Decimal("15"),
        quantidade=Decimal("1"),
        ordem=1,
    )
    fake_qs = Produto.objects.none()
    with patch(
        "composicao_painel.services.alternativas_produto.selecionar_disjuntores_caixa_moldada",
        return_value=fake_qs,
    ) as m_sel:
        assert listar_alternativas_para_sugestao(sugestao) is fake_qs
    assert m_sel.call_args.kwargs["modo_montagem"] == ModoMontagemChoices.TRILHO_DIN


@pytest.mark.django_db
def test_listar_alternativas_disjuntor_cm_excecao_ao_ler_modo_montagem_ignora():
    class SpecRuim:
        @property
        def modo_montagem(self):
            raise RuntimeError("spec indisponível")

    prod = SimpleNamespace(especificacao_disjuntor_caixa_moldada=SpecRuim())
    s = MagicMock()
    s.categoria_produto = CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA
    s.corrente_referencia_a = Decimal("8")
    s.produto_id = 1
    s.carga_id = None
    s.produto = prod
    fake_qs = Produto.objects.none()
    with patch(
        "composicao_painel.services.alternativas_produto.selecionar_disjuntores_caixa_moldada",
        return_value=fake_qs,
    ) as m_sel:
        assert listar_alternativas_para_sugestao(s) is fake_qs
    assert m_sel.call_args.kwargs["modo_montagem"] is None
