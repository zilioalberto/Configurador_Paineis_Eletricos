from apps.configurador_paineis.dimensionamento.services.disposicao_componentes import (
    ajustar_layout_placa_para_itens,
    segmentar_trilhos_din_com_disposicao,
    sugerir_disposicao_componentes,
    validar_disposicao_componentes,
)
from apps.configurador_paineis.dimensionamento.services.dimensionamento_mecanico import (
    _gerar_layout_placa,
)
from decimal import Decimal


def test_sugerir_disposicao_centraliza_no_trilho_sem_sobrepor_canaletas():
    layout = {
        "placa_largura_mm": 355,
        "placa_altura_mm": 355,
        "canaletas_verticais": [
            {"x_mm": 0, "y_mm": 0, "largura_mm": 30, "altura_mm": 355},
            {"x_mm": 325, "y_mm": 0, "largura_mm": 30, "altura_mm": 355},
        ],
        "canaletas_horizontais": [
            {"x_mm": 30, "y_mm": 0, "largura_mm": 295, "altura_mm": 30},
            {"x_mm": 30, "y_mm": 162, "largura_mm": 295, "altura_mm": 30},
            {"x_mm": 30, "y_mm": 325, "largura_mm": 295, "altura_mm": 30},
        ],
        "trilhos_din": [
            {"x_mm": 30, "y_mm": 88, "largura_mm": 295, "altura_mm": 8},
            {"x_mm": 30, "y_mm": 250, "largura_mm": 295, "altura_mm": 8},
        ],
        "zona_componentes": {"x_mm": 30, "y_mm": 30, "largura_mm": 295, "altura_mm": 265},
    }
    itens = [
        {
            "composicao_item_id": "11111111-1111-1111-1111-111111111111",
            "produto_codigo": "REL-1",
            "produto_descricao": "Relé",
            "quantidade": "2",
            "largura_mm": "22",
            "altura_mm": "90",
            "modo_montagem": "TRILHO_DIN",
        }
    ]

    disposicao = sugerir_disposicao_componentes(layout, itens)
    assert len(disposicao) == 2
    assert validar_disposicao_componentes(disposicao, layout) == []


def test_disjuntor_caixa_moldada_fica_no_trilho_superior_esquerda():
    layout = _gerar_layout_placa(
        355,
        355,
        canaletas_verticais=2,
        faixas_horizontais=2,
        largura_base_mm=Decimal("30"),
    )
    itens = [
        {
            "composicao_item_id": "11111111-1111-1111-1111-111111111111",
            "produto_codigo": "DCM-SEC",
            "produto_descricao": "Caixa moldada seccionamento",
            "quantidade": "1",
            "largura_mm": "105",
            "altura_mm": "160",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "SECCIONAMENTO",
            "categoria_produto": "DISJUNTOR_CAIXA_MOLDADA",
        }
    ]
    disposicao = sugerir_disposicao_componentes(layout, itens)
    trilhos = layout["trilhos_din"]
    idx_superior = min(
        range(len(trilhos)),
        key=lambda idx: trilhos[idx]["y_mm"] + trilhos[idx]["altura_mm"] / 2,
    )
    assert len(disposicao) == 1
    assert disposicao[0]["trilho_indice"] == idx_superior
    assert disposicao[0]["x_mm"] == trilhos[idx_superior]["x_mm"] + 10
    assert validar_disposicao_componentes(disposicao, layout) == []


def test_item_montagem_placa_centraliza_na_faixa_e_remove_trilho():
    layout = _gerar_layout_placa(
        355,
        355,
        canaletas_verticais=2,
        faixas_horizontais=2,
        largura_base_mm=Decimal("30"),
    )
    assert len(layout["trilhos_din"]) == 1

    itens = [
        {
            "composicao_item_id": "22222222-2222-2222-2222-222222222222",
            "produto_codigo": "DCM-PLACA",
            "produto_descricao": "Disjuntor em placa",
            "quantidade": "1",
            "largura_mm": "105",
            "altura_mm": "160",
            "modo_montagem": "PLACA",
        }
    ]

    layout_ajustado = ajustar_layout_placa_para_itens(layout, itens)
    assert len(layout_ajustado["trilhos_din"]) == 1

    disposicao = sugerir_disposicao_componentes(layout, itens)
    assert len(disposicao) == 1
    item = disposicao[0]
    assert item["trilho_indice"] is None

    zona = layout["zona_componentes"]
    assert item["x_mm"] == int(round(zona["x_mm"] + (zona["largura_mm"] - 105) / 2))

    faixa_y_inicio = layout["canaletas_horizontais"][0]["y_mm"] + layout["canaletas_horizontais"][0]["altura_mm"]
    faixa_y_fim = layout["canaletas_horizontais"][1]["y_mm"]
    expected_y = int(round(faixa_y_inicio + (faixa_y_fim - faixa_y_inicio - 160) / 2))
    assert item["y_mm"] == expected_y
    assert validar_disposicao_componentes(disposicao, layout) == []


def test_segmentar_trilho_din_recorta_sob_componente_placa():
    layout = _gerar_layout_placa(
        355,
        355,
        canaletas_verticais=2,
        faixas_horizontais=2,
        largura_base_mm=Decimal("30"),
    )
    trilho = layout["trilhos_din"][0]
    disposicao = [
        {
            "instancia_id": "dcm#0",
            "composicao_item_id": "dcm",
            "produto_codigo": "3VJ",
            "produto_descricao": "DCM placa",
            "modo_montagem": "PLACA",
            "x_mm": 200,
            "y_mm": 80,
            "largura_mm": 105,
            "altura_mm": 160,
            "trilho_indice": None,
            "manual": False,
        }
    ]

    segmentos = segmentar_trilhos_din_com_disposicao(layout["trilhos_din"], disposicao)
    assert len(segmentos) == 2
    assert segmentos[0]["x_mm"] == trilho["x_mm"]
    assert segmentos[0]["x_mm"] + segmentos[0]["largura_mm"] == 190
    assert segmentos[1]["x_mm"] == 315
    assert segmentos[1]["x_mm"] + segmentos[1]["largura_mm"] == trilho["x_mm"] + trilho["largura_mm"]


def test_sugerir_disposicao_nao_sobrepoe_disjuntor_geral_e_bornes_no_mesmo_trilho():
    layout = _gerar_layout_placa(
        355,
        355,
        canaletas_verticais=2,
        faixas_horizontais=2,
        largura_base_mm=Decimal("30"),
    )
    assert len(layout["trilhos_din"]) == 1

    itens = [
        {
            "composicao_item_id": "md-geral",
            "produto_codigo": "MD-GERAL",
            "produto_descricao": "Minidisjuntor geral",
            "quantidade": "1",
            "largura_mm": "18",
            "altura_mm": "90",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "PROTECAO_GERAL",
            "categoria_produto": "MINIDISJUNTOR",
        },
        {
            "composicao_item_id": "b1",
            "produto_codigo": "BORNE-1",
            "produto_descricao": "Borne 1",
            "quantidade": "1",
            "largura_mm": "8",
            "altura_mm": "45",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "COMANDO",
            "categoria_produto": "BORNE",
        },
        {
            "composicao_item_id": "b2",
            "produto_codigo": "BORNE-2",
            "produto_descricao": "Borne 2",
            "quantidade": "1",
            "largura_mm": "8",
            "altura_mm": "45",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "COMANDO",
            "categoria_produto": "BORNE",
        },
        {
            "composicao_item_id": "b3",
            "produto_codigo": "BORNE-3",
            "produto_descricao": "Borne 3",
            "quantidade": "1",
            "largura_mm": "8",
            "altura_mm": "45",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "COMANDO",
            "categoria_produto": "BORNE",
        },
    ]

    disposicao = sugerir_disposicao_componentes(layout, itens)
    assert len(disposicao) == 4
    assert validar_disposicao_componentes(disposicao, layout) == []

    md = next(d for d in disposicao if d["produto_codigo"] == "MD-GERAL")
    bornes = [d for d in disposicao if d["produto_codigo"].startswith("BORNE")]
    for borne in bornes:
        assert borne["x_mm"] >= md["x_mm"] + md["largura_mm"]


def test_sugerir_disposicao_agrupa_disjuntores_acima_das_contatoras():
    layout = _gerar_layout_placa(
        500,
        500,
        canaletas_verticais=2,
        faixas_horizontais=4,
        largura_base_mm=Decimal("30"),
    )
    itens = [
        {
            "composicao_item_id": "dj1",
            "produto_codigo": "DJ-1",
            "produto_descricao": "Disjuntor 1",
            "quantidade": "1",
            "largura_mm": "60",
            "altura_mm": "80",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "PROTECAO_CARGA",
            "categoria_produto": "DISJUNTOR_MOTOR",
        },
        {
            "composicao_item_id": "dj2",
            "produto_codigo": "DJ-2",
            "produto_descricao": "Disjuntor 2",
            "quantidade": "1",
            "largura_mm": "60",
            "altura_mm": "80",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "PROTECAO_CARGA",
            "categoria_produto": "DISJUNTOR_MOTOR",
        },
        {
            "composicao_item_id": "ct1",
            "produto_codigo": "CT-1",
            "produto_descricao": "Contatora 1",
            "quantidade": "1",
            "largura_mm": "55",
            "altura_mm": "75",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "ACIONAMENTO_CARGA",
            "categoria_produto": "CONTATORA",
        },
        {
            "composicao_item_id": "ct2",
            "produto_codigo": "CT-2",
            "produto_descricao": "Contatora 2",
            "quantidade": "1",
            "largura_mm": "55",
            "altura_mm": "75",
            "modo_montagem": "TRILHO_DIN",
            "parte_painel": "ACIONAMENTO_CARGA",
            "categoria_produto": "CONTATORA",
        },
    ]

    disposicao = sugerir_disposicao_componentes(layout, itens)
    disjuntores = [item for item in disposicao if item["produto_codigo"].startswith("DJ-")]
    contatoras = [item for item in disposicao if item["produto_codigo"].startswith("CT-")]

    assert len(disposicao) == 4
    assert len({item["trilho_indice"] for item in disjuntores}) == 1
    assert len({item["trilho_indice"] for item in contatoras}) == 1
    assert disjuntores[0]["y_mm"] < contatoras[0]["y_mm"]
    assert validar_disposicao_componentes(disposicao, layout) == []
