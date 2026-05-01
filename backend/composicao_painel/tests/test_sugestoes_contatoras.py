from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.core.exceptions import ValidationError

from cargas.models import Carga, CargaResistencia, CargaValvula
from catalogo.models import Produto
from composicao_painel.models import PendenciaItem, SugestaoItem
from composicao_painel.services.sugestoes.contatoras import (
    _validar_projeto_contatora,
    gerar_sugestoes_contatoras,
    processar_sugestao_contatora_para_carga,
    reprocessar_contatora_para_carga,
)
from core.choices import (
    CategoriaProdutoNomeChoices,
    NumeroFasesChoices,
    PartesPainelChoices,
    TensaoChoices,
)
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoPartidaMotorChoices,
    TipoProtecaoResistenciaChoices,
)
from core.choices.eletrica import TipoCorrenteChoices
from core.choices.produtos import UnidadeMedidaChoices


def test_validar_projeto_contatora_exige_campos():
    with pytest.raises(ValidationError, match="tensao_comando"):
        _validar_projeto_contatora(
            SimpleNamespace(tensao_comando=None, tipo_corrente_comando=TipoCorrenteChoices.CC)
        )
    with pytest.raises(ValidationError, match="tipo_corrente_comando"):
        _validar_projeto_contatora(
            SimpleNamespace(tensao_comando=TensaoChoices.V24, tipo_corrente_comando="")
        )


@pytest.mark.django_db
def test_contatora_motor_sem_carga_motor_pendencia(criar_projeto):
    projeto = criar_projeto(nome="CT1", codigo="14101-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M1",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    assert processar_sugestao_contatora_para_carga(projeto, carga) == []
    assert PendenciaItem.objects.filter(
        projeto=projeto,
        carga=carga,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
    ).exists()


@pytest.mark.django_db
def test_contatora_valvula_contator_quantidade_solenoides(criar_projeto):
    projeto = criar_projeto(
        nome="CTV", codigo="14114-26", tensao_nominal=TensaoChoices.V380
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="VCT",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        corrente_consumida_ma=Decimal("800.00"),
        quantidade_solenoides=3,
        tipo_acionamento=TipoAcionamentoValvulaChoices.CONTATOR,
    )
    produto = Produto.objects.create(
        codigo="CT-V",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sugs = processar_sugestao_contatora_para_carga(projeto, carga)
    assert len(sugs) == 1
    assert sugs[0].quantidade == Decimal("3")
    assert sugs[0].produto_id == produto.id


@pytest.mark.django_db
def test_contatora_valvula_sem_contator_limpa_escopo(criar_projeto):
    projeto = criar_projeto(
        nome="CTV2", codigo="14115-26", tensao_nominal=TensaoChoices.V380
    )
    carga = Carga.objects.create(
        projeto=projeto,
        tag="VRI",
        descricao="V",
        tipo=TipoCargaChoices.VALVULA,
    )
    CargaValvula.objects.create(
        carga=carga,
        corrente_consumida_ma=Decimal("200.00"),
        quantidade_solenoides=2,
        tipo_acionamento=TipoAcionamentoValvulaChoices.SOLENOIDE_DIRETO,
    )
    produto = Produto.objects.create(
        codigo="CT-V2",
        descricao="C",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=40,
    )
    assert processar_sugestao_contatora_para_carga(projeto, carga) == []
    assert not SugestaoItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_contatora_sensor_retorna_vazio(criar_projeto):
    projeto = criar_projeto(nome="CT2", codigo="14102-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="S1",
        descricao="S",
        tipo=TipoCargaChoices.SENSOR,
    )
    assert processar_sugestao_contatora_para_carga(projeto, carga) == []


@pytest.mark.django_db
def test_contatora_motor_inversor_limpa_escopo(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="CTI", codigo="14109-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="MI",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.INVERSOR,
    )
    produto = Produto.objects.create(
        codigo="CT-INV",
        descricao="C",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=40,
        indice_escopo=0,
    )
    assert processar_sugestao_contatora_para_carga(projeto, carga) == []
    assert not SugestaoItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_contatora_resistencia_sem_rele_ss_limpa_escopo(criar_projeto):
    projeto = criar_projeto(nome="CT3", codigo="14103-26", tensao_nominal=TensaoChoices.V380)
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
        tipo_acionamento=TipoAcionamentoResistenciaChoices.RELE_ESTADO_SOLIDO,
        potencia_kw=Decimal("1.500"),
    )
    produto = Produto.objects.create(
        codigo="CT-P1",
        descricao="C",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        carga=carga,
        produto=produto,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("1"),
        ordem=40,
    )
    assert processar_sugestao_contatora_para_carga(projeto, carga) == []
    assert not SugestaoItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_contatora_selector_vazio_pendencia(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="CT4", codigo="14104-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M4",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.none(),
    ):
        assert processar_sugestao_contatora_para_carga(projeto, carga) == []
    assert PendenciaItem.objects.filter(projeto=projeto, carga=carga).exists()


@pytest.mark.django_db
def test_contatora_cria_sugestao_com_produto_do_selector(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CT5", codigo="14105-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M5",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="CT-P5",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sugs = processar_sugestao_contatora_para_carga(projeto, carga)
    assert len(sugs) == 1
    assert sugs[0].produto_id == produto.id
    assert sugs[0].indice_escopo == 0


@pytest.mark.django_db
def test_contatora_estrela_triangulo_tres_sugestoes(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CTY", codigo="14110-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="MY",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.ESTRELA_TRIANGULO,
        potencia_corrente_unidade="A",
        potencia_corrente_valor=Decimal("100"),
    )
    p_k12 = Produto.objects.create(
        codigo="CT-Y-K12",
        descricao="K12",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    p_k3 = Produto.objects.create(
        codigo="CT-Y-K3",
        descricao="K3",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )

    def fake_selecionar(*args, corrente_nominal, **kwargs):
        cn = Decimal(str(corrente_nominal))
        if cn == Decimal("58.00"):
            return Produto.objects.filter(pk=p_k12.pk)
        if cn == Decimal("33.00"):
            return Produto.objects.filter(pk=p_k3.pk)
        return Produto.objects.none()

    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        side_effect=fake_selecionar,
    ):
        sugs = processar_sugestao_contatora_para_carga(projeto, carga)

    assert len(sugs) == 3
    assert [s.indice_escopo for s in sugs] == [0, 1, 2]
    assert sugs[0].produto_id == p_k12.id
    assert sugs[1].produto_id == p_k12.id
    assert sugs[2].produto_id == p_k3.id
    assert "K1" in (sugs[0].observacoes or "")
    assert "K2" in (sugs[1].observacoes or "")
    assert "K3" in (sugs[2].observacoes or "")


@pytest.mark.django_db
def test_reprocessar_contatora(criar_projeto, criar_carga_motor):
    projeto = criar_projeto(nome="CT6", codigo="14106-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M6",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="CT-P6",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        assert len(reprocessar_contatora_para_carga(projeto, carga)) == 1


@pytest.mark.django_db
def test_gerar_sugestoes_contatoras_remove_anteriores_e_itera(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CT7", codigo="14107-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="M7",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="CT-P7",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        out = gerar_sugestoes_contatoras(projeto)
    assert len(out) == 1


@pytest.mark.django_db
def test_gerar_sugestoes_contatoras_duas_cargas_motor(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CT8", codigo="14108-26", tensao_nominal=TensaoChoices.V380)
    produto = Produto.objects.create(
        codigo="CT-P8",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    for tag in ("MC", "MD"):
        carga = Carga.objects.create(
            projeto=projeto,
            tag=tag,
            descricao="M",
            tipo=TipoCargaChoices.MOTOR,
        )
        criar_carga_motor(carga=carga, tensao_motor=TensaoChoices.V380)
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        out = gerar_sugestoes_contatoras(projeto)
    assert len(out) == 2


@pytest.mark.django_db
def test_contatora_estrela_triangulo_reversivel_quatro_correntes_distintas(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CTY2", codigo="14111-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="MY2",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        tipo_partida=TipoPartidaMotorChoices.ESTRELA_TRIANGULO,
        potencia_corrente_unidade="A",
        potencia_corrente_valor=Decimal("100"),
        reversivel=True,
    )
    p_linha = Produto.objects.create(
        codigo="CT-Y-L",
        descricao="KL",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    p_k12 = Produto.objects.create(
        codigo="CT-Y-K12",
        descricao="K12",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    p_k3 = Produto.objects.create(
        codigo="CT-Y-K3",
        descricao="K3",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )

    def fake_selecionar(*args, corrente_nominal, **kwargs):
        cn = Decimal(str(corrente_nominal))
        if cn == Decimal("100.00"):
            return Produto.objects.filter(pk=p_linha.pk)
        if cn == Decimal("58.00"):
            return Produto.objects.filter(pk=p_k12.pk)
        if cn == Decimal("33.00"):
            return Produto.objects.filter(pk=p_k3.pk)
        return Produto.objects.none()

    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        side_effect=fake_selecionar,
    ):
        sugs = processar_sugestao_contatora_para_carga(projeto, carga)

    assert len(sugs) == 4
    assert [s.indice_escopo for s in sugs] == [0, 1, 2, 3]
    assert sugs[0].produto_id == p_linha.id
    assert sugs[1].produto_id == p_linha.id
    assert sugs[2].produto_id == p_k12.id
    assert sugs[3].produto_id == p_k3.id
    assert "K1" in (sugs[0].observacoes or "")
    assert "K1" in (sugs[1].observacoes or "")


@pytest.mark.django_db
def test_contatora_direta_reversivel_duas_sugestoes(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CTR", codigo="14112-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="MR",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        reversivel=True,
    )
    produto = Produto.objects.create(
        codigo="CT-DR",
        descricao="K",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        return_value=Produto.objects.filter(pk=produto.pk),
    ):
        sugs = processar_sugestao_contatora_para_carga(projeto, carga)
    assert len(sugs) == 2
    assert [s.indice_escopo for s in sugs] == [0, 1]


@pytest.mark.django_db
def test_contatora_freio_acrescenta_sugestao_6a(
    criar_projeto,
    criar_carga_motor,
):
    projeto = criar_projeto(nome="CTF", codigo="14113-26", tensao_nominal=TensaoChoices.V380)
    carga = Carga.objects.create(
        projeto=projeto,
        tag="MF",
        descricao="M",
        tipo=TipoCargaChoices.MOTOR,
    )
    criar_carga_motor(
        carga=carga,
        tensao_motor=TensaoChoices.V380,
        freio_motor=True,
    )
    p_linha = Produto.objects.create(
        codigo="CT-F-L",
        descricao="KL",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    p_freio = Produto.objects.create(
        codigo="CT-F-6",
        descricao="KF",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )

    def fake_selecionar(*args, corrente_nominal, **kwargs):
        cn = Decimal(str(corrente_nominal))
        if cn == Decimal("6"):
            return Produto.objects.filter(pk=p_freio.pk)
        return Produto.objects.filter(pk=p_linha.pk)

    with patch(
        "composicao_painel.services.sugestoes.contatoras.selecionar_contatoras",
        side_effect=fake_selecionar,
    ):
        sugs = processar_sugestao_contatora_para_carga(projeto, carga)

    assert len(sugs) == 2
    assert sugs[0].indice_escopo == 0
    assert sugs[1].indice_escopo == 1
    assert sugs[1].corrente_referencia_a == Decimal("6")
    assert "freio" in (sugs[1].observacoes or "").lower()
