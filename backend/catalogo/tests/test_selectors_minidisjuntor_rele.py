from decimal import Decimal

import pytest

from catalogo.models import (
    EspecificacaoFusivel,
    EspecificacaoMiniDisjuntor,
    EspecificacaoReleSobrecarga,
    Produto,
)
from catalogo.selectors.fusiveis import selecionar_fusiveis
from catalogo.selectors.minidisjuntor import selecionar_minidisjuntores
from catalogo.selectors.rele_sobrecarga import selecionar_reles_sobrecarga
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    CurvaDisparoMiniDisjuntorChoices,
    FormatoFusivelChoices,
    FusivelNHTamanhoChoices,
    ModoMontagemChoices,
    ModoMontagemReleSobrecargaChoices,
    NumeroPolosChoices,
    TipoFusivelChoices,
    UnidadeMedidaChoices,
)


@pytest.mark.django_db
def test_minidisjuntor_filtra_por_modo_curva_polos_e_tensao():
    p_ok = Produto.objects.create(
        codigo="MINI-OK",
        descricao="Mini OK",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_ok,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P2,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    p_out = Produto.objects.create(
        codigo="MINI-OUT",
        descricao="Mini OUT",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_out,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.B,
        numero_polos=NumeroPolosChoices.P2,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    qs = selecionar_minidisjuntores(
        corrente_nominal=8,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P2,
        tensao_nominal_v=None,
        niveis=1,
    )
    assert list(qs.values_list("codigo", flat=True)) == ["MINI-OK"]


@pytest.mark.django_db
def test_minidisjuntor_superior_a_corrente_exclui_igual():
    p_igual = Produto.objects.create(
        codigo="MINI-EQ",
        descricao="Mini 10A",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_igual,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    p_maior = Produto.objects.create(
        codigo="MINI-GT",
        descricao="Mini 16A",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=p_maior,
        corrente_nominal_a=Decimal("16"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    qs = selecionar_minidisjuntores(
        corrente_nominal=Decimal("10"),
        numero_polos=NumeroPolosChoices.P3,
        niveis=0,
        superior_a_corrente=True,
    )
    assert list(qs.values_list("codigo", flat=True)) == ["MINI-GT"]


@pytest.mark.django_db
def test_rele_sobrecarga_niveis_zero_retorna_ordenado():
    p_a = Produto.objects.create(
        codigo="RELE-A",
        descricao="Relé A",
        categoria=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleSobrecarga.objects.create(
        produto=p_a,
        faixa_ajuste_min_a=Decimal("1"),
        faixa_ajuste_max_a=Decimal("5"),
        modo_montagem=ModoMontagemReleSobrecargaChoices.TRILHO_DIN,
    )
    p_b = Produto.objects.create(
        codigo="RELE-B",
        descricao="Relé B",
        categoria=CategoriaProdutoNomeChoices.RELE_SOBRECARGA,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoReleSobrecarga.objects.create(
        produto=p_b,
        faixa_ajuste_min_a=Decimal("3"),
        faixa_ajuste_max_a=Decimal("9"),
        modo_montagem=ModoMontagemReleSobrecargaChoices.TRILHO_DIN,
    )
    qs = selecionar_reles_sobrecarga(
        corrente_nominal=Decimal("4"),
        modo_montagem=ModoMontagemReleSobrecargaChoices.TRILHO_DIN,
        niveis=0,
    )
    codigos = list(qs.values_list("codigo", flat=True))
    assert "RELE-A" in codigos and "RELE-B" in codigos


@pytest.mark.django_db
def test_fusivel_filtra_retardado_e_corrente_estritamente_superior():
    p_igual = Produto.objects.create(
        codigo="FUS-IGUAL",
        descricao="Fusível igual",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoFusivel.objects.create(
        produto=p_igual,
        tipo_fusivel=TipoFusivelChoices.RETARDADO,
        formato=FormatoFusivelChoices.NH,
        tamanho=FusivelNHTamanhoChoices.NH00,
        corrente_nominal_a=Decimal("10"),
    )
    p_rapido = Produto.objects.create(
        codigo="FUS-RAPIDO",
        descricao="Fusível rápido",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoFusivel.objects.create(
        produto=p_rapido,
        tipo_fusivel=TipoFusivelChoices.RAPIDO,
        formato=FormatoFusivelChoices.NH,
        tamanho=FusivelNHTamanhoChoices.NH00,
        corrente_nominal_a=Decimal("12"),
    )
    p_ok = Produto.objects.create(
        codigo="FUS-OK",
        descricao="Fusível OK",
        categoria=CategoriaProdutoNomeChoices.FUSIVEL,
        unidade_medida=UnidadeMedidaChoices.UN,
    )
    EspecificacaoFusivel.objects.create(
        produto=p_ok,
        tipo_fusivel=TipoFusivelChoices.RETARDADO,
        formato=FormatoFusivelChoices.NH,
        tamanho=FusivelNHTamanhoChoices.NH00,
        corrente_nominal_a=Decimal("16"),
    )

    qs = selecionar_fusiveis(
        corrente_nominal_maior_que_a=Decimal("10"),
        tipo_fusivel=TipoFusivelChoices.RETARDADO,
    )

    assert list(qs.values_list("codigo", flat=True)) == ["FUS-OK"]
