from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

import pytest

from catalogo.api import serializers as catalogo_serializers
from catalogo.api.serializers import (
    CATEGORIA_PARA_CAMPO,
    _ajustar_payload_regras_categoria,
    _defaults_para_categoria,
    _merge_spec,
    _raise_erro_especificacao_amigavel,
)
from core.choices.eletrica import TensaoChoices
from core.choices.paineis import CorPainelChoices, MaterialPainelChoices
from core.choices.produtos import (
    CategoriaProdutoNomeChoices,
    ConfiguracaoDisparadorDisjuntorCMChoices,
    FormatoFusivelChoices,
    FusivelCartuchoTamanhoChoices,
    FusivelNHTamanhoChoices,
    ModoMontagemChoices,
)


@pytest.mark.parametrize("categoria", list(CATEGORIA_PARA_CAMPO))
def test_defaults_para_categoria_cobre_categorias_com_especificacao(categoria):
    defaults = _defaults_para_categoria(categoria)

    assert isinstance(defaults, dict)
    assert defaults


def test_defaults_para_categoria_desconhecida_retorna_dict_vazio():
    assert _defaults_para_categoria("__categoria_inexistente__") == {}


def test_merge_spec_preserva_default_quando_incoming_none():
    assert _merge_spec({"a": 1, "b": 2}, {"a": None, "c": 3}) == {
        "a": 1,
        "b": 2,
        "c": 3,
    }
    assert _merge_spec({"a": 1}, None) == {"a": 1}


def test_ajustar_payload_minidisjuntor_forca_trilho_din():
    payload = {"modo_montagem": ModoMontagemChoices.PLACA}

    ajustado = _ajustar_payload_regras_categoria(
        CategoriaProdutoNomeChoices.MINIDISJUNTOR,
        payload,
    )

    assert ajustado["modo_montagem"] == ModoMontagemChoices.TRILHO_DIN


@pytest.mark.parametrize(
    ("formato", "tamanho_esperado"),
    [
        (FormatoFusivelChoices.NH, FusivelNHTamanhoChoices.NH00),
        (FormatoFusivelChoices.CARTUCHO, FusivelCartuchoTamanhoChoices.CART_10X38),
    ],
)
def test_ajustar_payload_fusivel_define_tamanho_padrao(formato, tamanho_esperado):
    payload = {"formato": formato, "tamanho": ""}

    ajustado = _ajustar_payload_regras_categoria(
        CategoriaProdutoNomeChoices.FUSIVEL,
        payload,
    )

    assert ajustado["tamanho"] == tamanho_esperado


def test_ajustar_payload_rele_estado_solido_limpa_dependentes_e_modo_invalido():
    payload = {
        "possui_dissipador": False,
        "tipo_dissipador": "QUALQUER",
        "possui_ventilacao": False,
        "tensao_ventilacao_v": TensaoChoices.V220,
        "modo_montagem": "INVALIDO",
    }

    ajustado = _ajustar_payload_regras_categoria(
        CategoriaProdutoNomeChoices.RELE_ESTADO_SOLIDO,
        payload,
    )

    assert ajustado["tipo_dissipador"] is None
    assert ajustado["tensao_ventilacao_v"] is None
    assert ajustado["modo_montagem"] == ModoMontagemChoices.TRILHO_DIN


@pytest.mark.parametrize(
    ("configuracao", "campos_nulos"),
    [
        (
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_LI_IR_AJUSTAVEL_II_FIXO,
            ("disparador_sobrecarga_ir_fixo_a", "disparador_curto_ii_ajuste_min_a"),
        ),
        (
            ConfiguracaoDisparadorDisjuntorCMChoices.TERMOMAGNETICO_LI_II_AJUSTAVEL,
            (
                "disparador_sobrecarga_ir_ajuste_min_a",
                "disparador_curto_ii_fixo_a",
            ),
        ),
    ],
)
def test_ajustar_payload_disjuntor_caixa_moldada_normaliza_campos(
    configuracao,
    campos_nulos,
):
    payload = {
        "configuracao_disparador": configuracao,
        "modo_montagem": ModoMontagemChoices.TRILHO_DIN,
        "disparador_sobrecarga_ir_fixo_a": "100.00",
        "disparador_sobrecarga_ir_ajuste_min_a": "80.00",
        "disparador_sobrecarga_ir_ajuste_max_a": "100.00",
        "disparador_curto_ii_fixo_a": "1000.00",
        "disparador_curto_ii_ajuste_min_a": "500.00",
        "disparador_curto_ii_ajuste_max_a": "1000.00",
    }

    ajustado = _ajustar_payload_regras_categoria(
        CategoriaProdutoNomeChoices.DISJUNTOR_CAIXA_MOLDADA,
        payload,
    )

    assert ajustado["modo_montagem"] == ModoMontagemChoices.PLACA
    for campo in campos_nulos:
        assert ajustado[campo] is None


def test_ajustar_payload_painel_inox_limpa_cor_e_aco_define_padrao():
    inox = _ajustar_payload_regras_categoria(
        CategoriaProdutoNomeChoices.PAINEL,
        {"material": MaterialPainelChoices.ACO_INOX, "cor": CorPainelChoices.RAL7035},
    )
    carbono = _ajustar_payload_regras_categoria(
        CategoriaProdutoNomeChoices.PAINEL,
        {"material": MaterialPainelChoices.ACO_CARBONO, "cor": ""},
    )

    assert inox["cor"] is None
    assert carbono["cor"] == CorPainelChoices.RAL7035


def test_ajustar_payload_climatizacao_normaliza_tensao_e_montagem_invalidas():
    payload = {"tensao_alimentacao_v": 999, "modo_montagem": "INVALIDO"}

    ajustado = _ajustar_payload_regras_categoria(
        CategoriaProdutoNomeChoices.CLIMATIZACAO,
        payload,
    )

    assert ajustado["tensao_alimentacao_v"] == TensaoChoices.V220
    assert ajustado["modo_montagem"] == ModoMontagemChoices.PORTA


def test_ajustar_payload_soft_starter_normaliza_montagem_e_protocolo():
    payload = {"tipo_montagem": ModoMontagemChoices.TRILHO_DIN, "protocolo_comunicacao": None}

    ajustado = _ajustar_payload_regras_categoria(
        CategoriaProdutoNomeChoices.SOFT_STARTER,
        payload,
    )

    assert ajustado["tipo_montagem"] == ModoMontagemChoices.PLACA
    assert ajustado["protocolo_comunicacao"] == ""


def test_raise_erro_especificacao_amigavel_preserva_detalhes():
    with pytest.raises(serializers.ValidationError) as exc_info:
        _raise_erro_especificacao_amigavel(
            "especificacao_minidisjuntor",
            DjangoValidationError({"corrente_nominal_a": ["Obrigatório."]}),
        )

    detalhe = exc_info.value.detail["especificacao_minidisjuntor"]
    assert "Não foi possível salvar" in str(detalhe["mensagem"])
    assert "corrente_nominal_a" in detalhe["detalhes"]


def test_spec_detail_retorna_none_para_categoria_diferente():
    produto = type("ProdutoFake", (), {"categoria": CategoriaProdutoNomeChoices.BORNE})()

    assert (
        catalogo_serializers._spec_detail(
            produto,
            CategoriaProdutoNomeChoices.CABO,
            object,
            object,
        )
        is None
    )
