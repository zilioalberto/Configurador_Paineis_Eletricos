from decimal import Decimal

import pytest

from apps.catalogo.models import (
    EspecificacaoCanaleta,
    EspecificacaoContatora,
    EspecificacaoDisjuntorCaixaMoldada,
    EspecificacaoDisjuntorMotor,
    EspecificacaoMiniDisjuntor,
    EspecificacaoPainel,
    EspecificacaoReleInterface,
    Produto,
)
from django.core.exceptions import ValidationError

from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
    aplicar_escolhas_dimensionamento_mecanico,
    calcular_dimensionamento_mecanico,
    calcular_e_salvar_dimensionamento_mecanico,
    calcular_faixas_horizontais_sugeridas,
)
from core.choices.eletrica import TensaoIluminacaoBotaoChoices
from core.choices.paineis import TipoInstalacaoPainelChoices, TipoPainelCatalogoChoices
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    ConfiguracaoDisparadorDisjuntorCMChoices,
    CurvaDisparoMiniDisjuntorChoices,
    ModoMontagemChoices,
    NumeroPolosChoices,
    TipoContatoChoices,
    TipoMontagemReleChoices,
)
from core.choices import StatusPendenciaChoices, StatusSugestaoChoices
from core.choices.paineis import (
    MaterialPainelChoices,
    PartesPainelChoices,
    TipoDisjuntorGeralChoices,
)
from apps.configurador_paineis.composicao_painel.models import (
    ComposicaoInclusaoManual,
    ComposicaoItem,
    PendenciaItem,
    SugestaoItem,
)


@pytest.mark.django_db
def test_calcular_dimensionamento_mecanico_soma_area_e_sugere_painel(criar_projeto):
    projeto = criar_projeto(nome="Mec", codigo="30001-26")

    prod_comp = Produto.objects.create(
        codigo="COMP-01",
        descricao="Contator teste",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        largura_mm=Decimal("45"),
        altura_mm=Decimal("90"),
        profundidade_mm=Decimal("75"),
    )
    EspecificacaoContatora.objects.create(
        produto=prod_comp,
        corrente_ac3_a=Decimal("25"),
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_comp,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.CONTATORA,
        quantidade=Decimal("2"),
    )

    prod_painel = Produto.objects.create(
        codigo="PAINEL-600",
        descricao="Painel 600x500",
        categoria=CategoriaProdutoNomeChoices.PAINEL,
        largura_mm=Decimal("650"),
        altura_mm=Decimal("550"),
        profundidade_mm=Decimal("200"),
    )
    EspecificacaoPainel.objects.create(
        produto=prod_painel,
        tipo_painel=TipoPainelCatalogoChoices.CAIXA_METALICA,
        tipo_instalacao=TipoInstalacaoPainelChoices.SOBREPOR,
        material=MaterialPainelChoices.ACO_CARBONO,
        placa_largura_util_mm=Decimal("600"),
        placa_altura_util_mm=Decimal("500"),
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert dados["area_componentes_mm2"] == "8100.00"
    assert dados["largura_placa_min_mm"] > 0
    assert dados["altura_placa_min_mm"] > 0
    assert dados["profundidade_min_mm"] >= 75
    assert len(dados["paineis_sugeridos"]) >= 1
    assert dados["paineis_sugeridos"][0]["produto_codigo"] == "PAINEL-600"


@pytest.mark.django_db
def test_sugestao_painel_considera_encaixe_da_disposicao(criar_projeto):
    projeto = criar_projeto(nome="MecEncaixe", codigo="30001B-26")

    prod_can = Produto.objects.create(
        codigo="CAN-30",
        descricao="Canaleta 30",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("30"),
        altura_mm=Decimal("50"),
        modo_montagem=ModoMontagemChoices.PLACA,
    )
    prod_comp = Produto.objects.create(
        codigo="DM-60",
        descricao="Disjuntor motor largo",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        largura_mm=Decimal("60"),
        altura_mm=Decimal("80"),
        profundidade_mm=Decimal("80"),
    )
    EspecificacaoDisjuntorMotor.objects.create(
        produto=prod_comp,
        faixa_ajuste_min_a=Decimal("1"),
        faixa_ajuste_max_a=Decimal("6"),
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_comp,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        quantidade=Decimal("10"),
    )

    for codigo, largura in (("PAINEL-PEQ", "355"), ("PAINEL-GRD", "500")):
        prod_painel = Produto.objects.create(
            codigo=codigo,
            descricao=codigo,
            categoria=CategoriaProdutoNomeChoices.PAINEL,
            profundidade_mm=Decimal("200"),
        )
        EspecificacaoPainel.objects.create(
            produto=prod_painel,
            tipo_painel=TipoPainelCatalogoChoices.CAIXA_METALICA,
            tipo_instalacao=TipoInstalacaoPainelChoices.SOBREPOR,
            material=MaterialPainelChoices.ACO_CARBONO,
            placa_largura_util_mm=Decimal(largura),
            placa_altura_util_mm=Decimal("355"),
        )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert dados["paineis_sugeridos"][0]["produto_codigo"] == "PAINEL-GRD"
    assert "PAINEL-PEQ" not in {p["produto_codigo"] for p in dados["paineis_sugeridos"]}


@pytest.mark.django_db
def test_calcular_dimensionamento_mecanico_ignora_item_porta(criar_projeto):
    projeto = criar_projeto(nome="Mec2", codigo="30002-26")

    from apps.catalogo.models import EspecificacaoBotao

    prod_botao = Produto.objects.create(
        codigo="BTN-01",
        descricao="Botão porta",
        categoria=CategoriaProdutoNomeChoices.BOTAO,
        largura_mm=Decimal("30"),
        altura_mm=Decimal("40"),
    )
    EspecificacaoBotao.objects.create(
        produto=prod_botao,
        modo_montagem=ModoMontagemChoices.PORTA,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_botao,
        parte_painel=PartesPainelChoices.BOTOEIRAS,
        categoria_produto=CategoriaProdutoNomeChoices.BOTAO,
        quantidade=Decimal("1"),
    )

    dados = calcular_dimensionamento_mecanico(projeto)
    assert dados["area_componentes_mm2"] == "0.00"
    assert dados["itens_considerados"] == []


@pytest.mark.django_db
def test_calcular_e_salvar_persiste_no_resumo(criar_projeto):
    projeto = criar_projeto(nome="Mec3", codigo="30003-26")
    prod = Produto.objects.create(
        codigo="MD-01",
        descricao="Mini",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        largura_mm=Decimal("18"),
        altura_mm=Decimal("90"),
        profundidade_mm=Decimal("70"),
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=prod,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P1,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
    )

    resumo, dados = calcular_e_salvar_dimensionamento_mecanico(projeto)
    resumo.refresh_from_db()

    assert resumo.largura_painel_mm == dados["largura_placa_min_mm"]
    assert resumo.detalhe_dimensionamento_mecanico["area_componentes_mm2"] == "1620.00"


def test_calcular_faixas_horizontais_tres_pecas_em_placa_450():
    assert calcular_faixas_horizontais_sugeridas(450, 50, 160) == 3


def test_calcular_faixas_horizontais_duas_pecas_em_placa_baixa():
    assert calcular_faixas_horizontais_sugeridas(200, 50, 160) == 2


@pytest.mark.django_db
def test_calcular_dimensionamento_mecanico_lista_canaletas_catalogo(criar_projeto):
    projeto = criar_projeto(nome="MecCan", codigo="30004-26")
    prod_can = Produto.objects.create(
        codigo="CAN-50",
        descricao="Canaleta 50",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("50"),
        altura_mm=Decimal("50"),
        modo_montagem=ModoMontagemChoices.PLACA,
    )
    prod_comp = Produto.objects.create(
        codigo="COMP-CAN",
        descricao="Relé",
        categoria=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        largura_mm=Decimal("22"),
        altura_mm=Decimal("90"),
    )
    EspecificacaoReleInterface.objects.create(
        produto=prod_comp,
        tipo_rele="ESTADO_SOLIDO",
        tensao_bobina_v=TensaoIluminacaoBotaoChoices.V24,
        quantidade_contatos=1,
        tipo_contato=TipoContatoChoices.NA,
        corrente_contato_a=Decimal("1"),
        tipo_montagem=TipoMontagemReleChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_comp,
        parte_painel=PartesPainelChoices.COMANDO,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        quantidade=Decimal("1"),
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert len(dados["canaletas_catalogo"]) >= 1
    assert dados["canaleta"]["produto_codigo"] == "CAN-50"
    assert dados["faixas_horizontais_sugeridas"] >= 2


@pytest.mark.django_db
def test_layout_placa_inclui_trilhos_din_entre_canaletas_horizontais(criar_projeto):
    projeto = criar_projeto(nome="MecTrilho", codigo="30009-26")

    prod_can = Produto.objects.create(
        codigo="CAN-TRILHO",
        descricao="Canaleta trilho",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("30"),
        altura_mm=Decimal("50"),
    )
    prod_comp = Produto.objects.create(
        codigo="COMP-TRILHO",
        descricao="Relé trilho",
        categoria=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        largura_mm=Decimal("22"),
        altura_mm=Decimal("90"),
    )
    EspecificacaoReleInterface.objects.create(
        produto=prod_comp,
        tipo_rele="ESTADO_SOLIDO",
        tensao_bobina_v=TensaoIluminacaoBotaoChoices.V24,
        quantidade_contatos=1,
        tipo_contato=TipoContatoChoices.NA,
        corrente_contato_a=Decimal("1"),
        tipo_montagem=TipoMontagemReleChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_comp,
        parte_painel=PartesPainelChoices.COMANDO,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        quantidade=Decimal("1"),
    )
    prod_painel = Produto.objects.create(
        codigo="PAINEL-TRILHO",
        descricao="Painel trilho",
        categoria=CategoriaProdutoNomeChoices.PAINEL,
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

    dados = calcular_dimensionamento_mecanico(
        projeto,
        painel_produto_id=str(prod_painel.id),
        canaleta_produto_id=str(prod_can.id),
        canaletas_verticais=2,
        faixas_horizontais=3,
    )

    layout = dados["layout_placa"]
    assert len(layout["canaletas_horizontais"]) == 3
    assert len(layout["trilhos_din"]) == 2
    assert layout["trilhos_din"][0]["comprimento_mm"] == 295
    disposicao = dados["disposicao_componentes"]
    assert len(disposicao) == 1
    assert disposicao[0]["modo_montagem"] == "TRILHO_DIN"
    assert disposicao[0]["trilho_indice"] is not None


@pytest.mark.django_db
def test_aplicar_escolhas_salva_painel_e_canaletas(criar_projeto):
    projeto = criar_projeto(nome="MecEsc", codigo="30005-26")

    prod_can = Produto.objects.create(
        codigo="CAN-40",
        descricao="Canaleta 40",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("40"),
        altura_mm=Decimal("40"),
    )
    prod_comp = Produto.objects.create(
        codigo="COMP-ESC",
        descricao="MD",
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
    prod_painel = Produto.objects.create(
        codigo="PAINEL-ESC",
        descricao="Painel escolhido",
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

    calcular_e_salvar_dimensionamento_mecanico(projeto)
    resumo, dados = aplicar_escolhas_dimensionamento_mecanico(
        projeto,
        painel_produto_id=str(prod_painel.id),
        canaleta_produto_id=str(prod_can.id),
        canaletas_verticais=2,
        faixas_horizontais=3,
    )

    assert dados["painel_escolhido"]["produto_codigo"] == "PAINEL-ESC"
    assert dados["canaleta_escolhida"]["produto_codigo"] == "CAN-40"
    assert dados["canaletas_verticais"] == 2
    assert dados["faixas_horizontais"] == 3
    assert resumo.largura_painel_mm == 450
    assert resumo.altura_painel_mm == 450


@pytest.mark.django_db
def test_aplicar_escolhas_mescla_disposicao_incompleta(criar_projeto):
    projeto = criar_projeto(nome="MecDisp", codigo="30009-26")

    prod_can = Produto.objects.create(
        codigo="CAN-DISP",
        descricao="Canaleta disp",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("30"),
        altura_mm=Decimal("30"),
    )
    prod_comp = Produto.objects.create(
        codigo="COMP-DISP",
        descricao="MD disp",
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
    item = ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_comp,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("2"),
    )
    prod_painel = Produto.objects.create(
        codigo="PAINEL-DISP",
        descricao="Painel disp",
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

    calcular_e_salvar_dimensionamento_mecanico(projeto)
    _, dados = aplicar_escolhas_dimensionamento_mecanico(
        projeto,
        painel_produto_id=str(prod_painel.id),
        canaleta_produto_id=str(prod_can.id),
        canaletas_verticais=2,
        faixas_horizontais=3,
        disposicao_componentes=[
            {
                "instancia_id": f"{item.id}#0",
                "composicao_item_id": str(item.id),
                "produto_codigo": "COMP-DISP",
                "produto_descricao": "MD disp",
                "modo_montagem": "TRILHO_DIN",
                "x_mm": 40,
                "y_mm": 100,
                "largura_mm": 18,
                "altura_mm": 90,
                "trilho_indice": 0,
                "manual": True,
            }
        ],
    )

    assert len(dados["disposicao_componentes"]) == 2
    ids = {row["instancia_id"] for row in dados["disposicao_componentes"]}
    assert ids == {f"{item.id}#0", f"{item.id}#1"}


@pytest.mark.django_db
def test_calcular_dimensionamento_mecanico_somente_trilho_ou_placa(criar_projeto):
    projeto = criar_projeto(nome="MecMont", codigo="30006-26")

    prod_trilho = Produto.objects.create(
        codigo="DM-TRILHO",
        descricao="Disjuntor motor trilho",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        fabricante="SIEMENS",
        largura_mm=Decimal("55"),
        altura_mm=Decimal("100"),
    )
    EspecificacaoDisjuntorMotor.objects.create(
        produto=prod_trilho,
        faixa_ajuste_min_a=Decimal("9"),
        faixa_ajuste_max_a=Decimal("14"),
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_trilho,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        quantidade=Decimal("1"),
    )

    prod_porta = Produto.objects.create(
        codigo="DM-PORTA",
        descricao="Disjuntor motor porta",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        largura_mm=Decimal("55"),
        altura_mm=Decimal("100"),
    )
    EspecificacaoDisjuntorMotor.objects.create(
        produto=prod_porta,
        faixa_ajuste_min_a=Decimal("9"),
        faixa_ajuste_max_a=Decimal("14"),
        modo_montagem=ModoMontagemChoices.PORTA,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_porta,
        parte_painel=PartesPainelChoices.ACIONAMENTO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_MOTOR,
        quantidade=Decimal("1"),
    )

    prod_sem_spec = Produto.objects.create(
        codigo="MD-SEM-SPEC",
        descricao="Mini sem especificação",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        largura_mm=Decimal("18"),
        altura_mm=Decimal("90"),
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_sem_spec,
        parte_painel=PartesPainelChoices.COMANDO,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert dados["area_componentes_mm2"] == "5500.00"
    assert len(dados["itens_considerados"]) == 1
    assert dados["itens_considerados"][0]["produto_codigo"] == "DM-TRILHO"
    assert dados["itens_considerados"][0]["fabricante"] == "SIEMENS"
    assert dados["itens_considerados"][0]["modo_montagem"] == ModoMontagemChoices.TRILHO_DIN


@pytest.mark.django_db
def test_validacao_zona_util_rejeita_excesso_canaletas_horizontais(criar_projeto):
    projeto = criar_projeto(nome="MecVal", codigo="30007-26")

    prod_can = Produto.objects.create(
        codigo="CAN-VAL",
        descricao="Canaleta val",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("50"),
        altura_mm=Decimal("30"),
    )
    prod_comp = Produto.objects.create(
        codigo="COMP-VAL",
        descricao="Relé val",
        categoria=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        largura_mm=Decimal("22"),
        altura_mm=Decimal("90"),
    )
    EspecificacaoReleInterface.objects.create(
        produto=prod_comp,
        tipo_rele="ESTADO_SOLIDO",
        tensao_bobina_v=TensaoIluminacaoBotaoChoices.V24,
        quantidade_contatos=1,
        tipo_contato=TipoContatoChoices.NA,
        corrente_contato_a=Decimal("1"),
        tipo_montagem=TipoMontagemReleChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod_comp,
        parte_painel=PartesPainelChoices.COMANDO,
        categoria_produto=CategoriaProdutoNomeChoices.RELE_INTERFACE,
        quantidade=Decimal("10"),
    )
    prod_painel = Produto.objects.create(
        codigo="PAINEL-VAL",
        descricao="Painel val",
        categoria=CategoriaProdutoNomeChoices.PAINEL,
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

    dados = calcular_dimensionamento_mecanico(
        projeto,
        painel_produto_id=str(prod_painel.id),
        canaleta_produto_id=str(prod_can.id),
        canaletas_verticais=2,
        faixas_horizontais=10,
    )

    assert dados["validacao_zona_util"]["ok"] is False
    assert dados["zona_util_componentes"]["altura_zona_componentes_mm"] < 0
    assert any("horizontais" in msg for msg in dados["validacao_zona_util"]["alertas"])
    assert dados["layout_placa"]["comprimento_canaleta_horizontal_mm"] == 355 - 2 * 50
    assert dados["layout_placa"]["comprimento_canaleta_vertical_mm"] == 355 - 2 * 50

    calcular_e_salvar_dimensionamento_mecanico(projeto)
    with pytest.raises(ValidationError):
        aplicar_escolhas_dimensionamento_mecanico(
            projeto,
            painel_produto_id=str(prod_painel.id),
            canaleta_produto_id=str(prod_can.id),
            canaletas_verticais=2,
            faixas_horizontais=10,
        )


@pytest.mark.django_db
def test_taxa_ocupacao_max_projeto_recalcula_area_minima(criar_projeto):
    projeto = criar_projeto(nome="MecTaxa", codigo="30008-26")
    prod = Produto.objects.create(
        codigo="MD-TAXA",
        descricao="Mini taxa",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        largura_mm=Decimal("18"),
        altura_mm=Decimal("90"),
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=prod,
        corrente_nominal_a=Decimal("10"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P1,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod,
        parte_painel=PartesPainelChoices.PROTECAO_CARGA,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
    )

    dados_80 = calcular_dimensionamento_mecanico(projeto, taxa_ocupacao_max_percentual="80")
    dados_60 = calcular_dimensionamento_mecanico(projeto, taxa_ocupacao_max_percentual="60")

    assert Decimal(dados_60["area_zona_util_min_mm2"]) > Decimal(dados_80["area_zona_util_min_mm2"])
    assert dados_60["taxa_ocupacao_max_configurada_percentual"] == "60.00"


@pytest.mark.django_db
def test_disjuntor_geral_reserva_mecanica_quando_sem_composicao(criar_projeto):
    projeto = criar_projeto(
        nome="MecGeralRes",
        codigo="30009-26",
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.MINIDISJUNTOR,
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert len(dados["itens_considerados"]) == 1
    item = dados["itens_considerados"][0]
    assert item["produto_codigo"] == "RESERVA-MINIDISJUNTOR"
    assert item["reserva_mecanica"] is True
    assert item["origem_item"] == "reserva_pendencia"
    assert item["parte_painel"] == PartesPainelChoices.PROTECAO_GERAL
    assert item["modo_montagem"] == ModoMontagemChoices.TRILHO_DIN
    assert item["area_frontal_mm2"] == "1620.00"


@pytest.mark.django_db
def test_disjuntor_geral_sugestao_pendente_entra_no_dimensionamento(criar_projeto):
    projeto = criar_projeto(
        nome="MecGeralSug",
        codigo="30010-26",
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.MINIDISJUNTOR,
    )
    prod = Produto.objects.create(
        codigo="MD-GERAL",
        descricao="Minidisjuntor geral",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        largura_mm=Decimal("18"),
        altura_mm=Decimal("90"),
        profundidade_mm=Decimal("70"),
    )
    EspecificacaoMiniDisjuntor.objects.create(
        produto=prod,
        corrente_nominal_a=Decimal("63"),
        curva_disparo=CurvaDisparoMiniDisjuntorChoices.C,
        numero_polos=NumeroPolosChoices.P3,
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        produto=prod,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
        status=StatusSugestaoChoices.PENDENTE,
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert len(dados["itens_considerados"]) == 1
    item = dados["itens_considerados"][0]
    assert item["produto_codigo"] == "MD-GERAL"
    assert item["origem_item"] == "sugestao"
    assert item.get("reserva_mecanica") is not True
    assert item["modo_montagem"] == ModoMontagemChoices.TRILHO_DIN


@pytest.mark.django_db
def test_disjuntor_geral_composicao_aprovada_nao_duplica_reserva(criar_projeto):
    projeto = criar_projeto(
        nome="MecGeralComp",
        codigo="30011-26",
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    prod = Produto.objects.create(
        codigo="DCM-GERAL",
        descricao="Disjuntor caixa moldada geral",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        largura_mm=Decimal("105"),
        altura_mm=Decimal("160"),
        profundidade_mm=Decimal("200"),
    )
    EspecificacaoDisjuntorCaixaMoldada.objects.create(
        produto=prod,
        corrente_nominal_a=Decimal("100"),
        numero_polos=NumeroPolosChoices.P3,
        configuracao_disparador=(
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_IR_II_FIXOS
        ),
        capacidade_interrupcao_380v_ka=Decimal("50"),
        modo_montagem=ModoMontagemChoices.PLACA,
    )
    ComposicaoItem.objects.create(
        projeto=projeto,
        produto=prod,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        quantidade=Decimal("1"),
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert len(dados["itens_considerados"]) == 1
    item = dados["itens_considerados"][0]
    assert item["produto_codigo"] == "DCM-GERAL"
    assert item["origem_item"] == "composicao"
    assert item["modo_montagem"] == ModoMontagemChoices.TRILHO_DIN
    assert item["area_frontal_mm2"] == "16800.00"


@pytest.mark.django_db
def test_disjuntor_geral_pendencia_usa_descricao_na_reserva(criar_projeto):
    projeto = criar_projeto(
        nome="MecGeralPend",
        codigo="30012-26",
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.DISJUNTOR_CAIXA_MOLDADA,
    )
    pendencia = PendenciaItem.objects.create(
        projeto=projeto,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        descricao="Disjuntor geral 100A — aguardando catálogo",
        status=StatusPendenciaChoices.ABERTA,
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert len(dados["itens_considerados"]) == 1
    item = dados["itens_considerados"][0]
    assert item["composicao_item_id"] == str(pendencia.id)
    assert item["produto_descricao"] == pendencia.descricao
    assert item["produto_codigo"] == "RESERVA-DISJUNTOR_CAIXA_MOLDADA"
    assert item["area_frontal_mm2"] == "16800.00"


@pytest.mark.django_db
def test_disjuntor_geral_sugestao_sem_especificacao_entra_no_dimensionamento(criar_projeto):
    projeto = criar_projeto(
        nome="MecGeralSemSpec",
        codigo="30013-26",
        possui_disjuntor_geral=True,
        tipo_disjuntor_geral=TipoDisjuntorGeralChoices.MINIDISJUNTOR,
    )
    prod = Produto.objects.create(
        codigo="5SL1",
        descricao="Minidisjuntor geral",
        categoria=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        largura_mm=Decimal("18"),
        altura_mm=Decimal("90"),
        profundidade_mm=Decimal("70"),
    )
    SugestaoItem.objects.create(
        projeto=projeto,
        produto=prod,
        parte_painel=PartesPainelChoices.PROTECAO_GERAL,
        categoria_produto=CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        quantidade=Decimal("1"),
        status=StatusSugestaoChoices.PENDENTE,
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert len(dados["itens_considerados"]) == 1
    assert dados["itens_considerados"][0]["produto_codigo"] == "5SL1"
    assert len(dados["disposicao_componentes"]) == 1
    assert dados["disposicao_componentes"][0]["produto_codigo"] == "5SL1"


@pytest.mark.django_db
def test_inclusao_manual_catalogo_entra_no_dimensionamento_mecanico(criar_projeto):
    projeto = criar_projeto(nome="MecManual", codigo="30014-26")
    prod = Produto.objects.create(
        codigo="3VJ",
        descricao="CAIXA MOLDADA 100A",
        categoria=CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        largura_mm=Decimal("105"),
        altura_mm=Decimal("160"),
        profundidade_mm=Decimal("200"),
    )
    EspecificacaoDisjuntorCaixaMoldada.objects.create(
        produto=prod,
        corrente_nominal_a=Decimal("100"),
        numero_polos=NumeroPolosChoices.P3,
        configuracao_disparador=(
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_IR_II_FIXOS
        ),
        capacidade_interrupcao_380v_ka=Decimal("50"),
        modo_montagem=ModoMontagemChoices.PLACA,
    )
    inc = ComposicaoInclusaoManual.objects.create(
        projeto=projeto,
        produto=prod,
        quantidade=Decimal("1"),
        observacoes="reserva",
    )

    dados = calcular_dimensionamento_mecanico(projeto)

    assert len(dados["itens_considerados"]) == 1
    item = dados["itens_considerados"][0]
    assert item["produto_codigo"] == "3VJ"
    assert item["origem_item"] == "inclusao_manual"
    assert item["composicao_item_id"] == str(inc.id)
    assert item["parte_painel"] == PartesPainelChoices.COMANDO
    assert item["modo_montagem"] == ModoMontagemChoices.PLACA
    assert item["area_frontal_mm2"] == "16800.00"


@pytest.mark.django_db
def test_obter_dimensionamento_mecanico_atualizado_inclusao_manual_e_disposicao(criar_projeto):
    projeto = criar_projeto(nome="MecObter", codigo="30015-26")

    prod_can = Produto.objects.create(
        codigo="CAN-OBTER",
        descricao="Canaleta obter",
        categoria=CategoriaProdutoNomeChoices.CANALETA,
    )
    EspecificacaoCanaleta.objects.create(
        produto=prod_can,
        largura_base_mm=Decimal("30"),
        altura_mm=Decimal("30"),
    )
    prod_md = Produto.objects.create(
        codigo="MD-OBTER",
        descricao="Mini obter",
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
        codigo="MAN-OBTER",
        descricao="Contator manual",
        categoria=CategoriaProdutoNomeChoices.CONTATORA,
        largura_mm=Decimal("45"),
        altura_mm=Decimal("90"),
    )
    EspecificacaoContatora.objects.create(
        produto=prod_manual,
        corrente_ac3_a=Decimal("12"),
        modo_montagem=ModoMontagemChoices.TRILHO_DIN,
    )
    prod_painel = Produto.objects.create(
        codigo="PAINEL-OBTER",
        descricao="Painel obter",
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

    calcular_e_salvar_dimensionamento_mecanico(projeto)
    aplicar_escolhas_dimensionamento_mecanico(
        projeto,
        painel_produto_id=str(prod_painel.id),
        canaleta_produto_id=str(prod_can.id),
        canaletas_verticais=2,
        faixas_horizontais=3,
    )
    ComposicaoInclusaoManual.objects.create(
        projeto=projeto,
        produto=prod_manual,
        quantidade=Decimal("1"),
    )

    from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
        obter_dimensionamento_mecanico_atualizado,
    )

    dados = obter_dimensionamento_mecanico_atualizado(projeto)
    codigos = {item["produto_codigo"] for item in dados["itens_considerados"]}
    assert codigos == {"MD-OBTER", "MAN-OBTER"}
    assert len(dados["disposicao_componentes"]) == 2


def test_posicoes_x_canaletas_verticais_distribui_entre_bordas():
    from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
        _posicoes_x_canaletas_verticais,
    )

    assert _posicoes_x_canaletas_verticais(355, 0, 30) == []
    assert _posicoes_x_canaletas_verticais(355, 1, 30) == [0]
    assert _posicoes_x_canaletas_verticais(355, 2, 30) == [0, 325]
    assert _posicoes_x_canaletas_verticais(355, 3, 30) == [0, 162, 325]


def test_posicoes_y_faixas_horizontais_respeita_intermediarias_customizadas():
    from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
        _posicoes_y_faixas_horizontais,
        _posicoes_y_intermediarias_padrao,
    )

    assert _posicoes_y_intermediarias_padrao(450, 2, 30) == []
    assert _posicoes_y_intermediarias_padrao(450, 3, 30) == [210]

    assert _posicoes_y_faixas_horizontais(355, 0, 30) == []
    assert _posicoes_y_faixas_horizontais(355, 1, 30) == [0]
    assert _posicoes_y_faixas_horizontais(355, 2, 30) == [0, 325]
    assert _posicoes_y_faixas_horizontais(355, 3, 30, [150]) == [0, 150, 325]


def test_gerar_trilhos_din_layout_entre_faixas_horizontais():
    from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
        _gerar_trilhos_din_layout,
    )

    horizontais = [
        {"y_mm": 0, "altura_mm": 30},
        {"y_mm": 163, "altura_mm": 30},
        {"y_mm": 325, "altura_mm": 30},
    ]
    trilhos = _gerar_trilhos_din_layout(
        horizontais,
        x_inicio_mm=30,
        comprimento_mm=295,
        altura_perfil_mm=35,
    )
    assert len(trilhos) == 2
    assert trilhos[0]["comprimento_mm"] == 295
    assert trilhos[0]["orientacao"] == "trilho_din"


def test_gerar_layout_placa_monta_canaletas_e_zona_util():
    from decimal import Decimal

    from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
        _gerar_layout_placa,
    )

    layout = _gerar_layout_placa(
        355,
        355,
        canaletas_verticais=2,
        faixas_horizontais=3,
        largura_base_mm=Decimal("30"),
        canaleta_altura_perfil_mm=50,
    )

    assert layout["placa_largura_mm"] == 355
    assert len(layout["canaletas_verticais"]) == 2
    assert len(layout["canaletas_horizontais"]) == 3
    assert len(layout["trilhos_din"]) == 2
    assert layout["zona_componentes"]["largura_mm"] == 295
    assert layout["zona_componentes"]["altura_mm"] == 265


def test_enriquecer_detalhe_dimensionamento_mecanico_retorna_none_quando_vazio():
    from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
        enriquecer_detalhe_dimensionamento_mecanico,
    )

    assert enriquecer_detalhe_dimensionamento_mecanico(None) is None
