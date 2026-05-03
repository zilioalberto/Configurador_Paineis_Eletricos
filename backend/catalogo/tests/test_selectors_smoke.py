"""Exercita selectors e `_base` com BD vazia para cobrir ramos principais."""

from __future__ import annotations

from decimal import Decimal

import pytest

from catalogo import selectors as sel
from catalogo.selectors._base import filtrar_produtos_especificacao, related_name_para_categoria
from core.choices.cargas import (
    TipoAcionamentoResistenciaChoices,
    TipoAcionamentoValvulaChoices,
    TipoCargaChoices,
    TipoProtecaoResistenciaChoices,
)
from core.choices.eletrica import TipoCorrenteChoices, TensaoChoices
from core.choices.paineis import MaterialPainelChoices
from core.choices.produtos import CategoriaProdutoNomeChoices


@pytest.mark.django_db
def test_base_related_name_e_filtro_categoria_invalida():
    assert related_name_para_categoria("__nao_existe__") is None
    assert not filtrar_produtos_especificacao("__nao_existe__").exists()


@pytest.mark.django_db
def test_base_filtro_ignora_valores_none():
    qs = filtrar_produtos_especificacao(
        CategoriaProdutoNomeChoices.BORNE,
        modo_montagem=None,
    )
    assert list(qs) == []


@pytest.mark.django_db
def test_selectors_smoke_chamadas_minimas():
    assert list(sel.selecionar_barramentos()) == []
    assert list(sel.selecionar_bornes()) == []
    assert list(sel.selecionar_botoes()) == []
    assert list(sel.selecionar_cabos()) == []
    assert list(sel.selecionar_canaletas()) == []
    assert list(sel.selecionar_chaves_seletoras()) == []

    assert not sel.selecionar_climatizacoes(tensao_alimentacao_v=999).exists()
    assert not sel.selecionar_climatizacoes(modo_montagem="INVALIDO").exists()
    assert list(sel.selecionar_climatizacoes()) == []

    assert not sel.selecionar_contatoras(
        TipoCargaChoices.MOTOR,
        corrente_nominal=None,
        tensao_comando=TensaoChoices.V24,
        tipo_corrente_comando=TipoCorrenteChoices.CC,
    ).exists()
    assert not sel.selecionar_contatoras(
        TipoCargaChoices.SENSOR,
        corrente_nominal=Decimal("1"),
        tensao_comando=TensaoChoices.V24,
        tipo_corrente_comando=TipoCorrenteChoices.CC,
    ).exists()
    assert not sel.selecionar_contatoras(
        TipoCargaChoices.VALVULA,
        corrente_nominal=Decimal("1"),
        tensao_comando=TensaoChoices.V24,
        tipo_corrente_comando=TipoCorrenteChoices.CC,
        tipo_acionamento=TipoAcionamentoValvulaChoices.RELE_INTERFACE,
    ).exists()
    assert list(
        sel.selecionar_contatoras(
            TipoCargaChoices.RESISTENCIA,
            corrente_nominal=Decimal("10"),
            tensao_comando=TensaoChoices.V24,
            tipo_corrente_comando=TipoCorrenteChoices.CC,
            tipo_acionamento=TipoAcionamentoResistenciaChoices.CONTATOR,
            niveis=0,
        )
    ) == []
    assert list(
        sel.selecionar_contatoras(
            TipoCargaChoices.VALVULA,
            corrente_nominal=Decimal("10"),
            tensao_comando=TensaoChoices.V24,
            tipo_corrente_comando=TipoCorrenteChoices.CC,
            tipo_acionamento=TipoAcionamentoValvulaChoices.CONTATOR,
            niveis=0,
        )
    ) == []
    assert list(
        sel.selecionar_contatoras(
            TipoCargaChoices.MOTOR,
            corrente_nominal=Decimal("10"),
            tensao_comando=TensaoChoices.V24,
            tipo_corrente_comando=TipoCorrenteChoices.CC,
            niveis=0,
        )
    ) == []

    assert list(sel.selecionar_controladores_temperatura()) == []
    assert list(
        sel.selecionar_disjuntores_caixa_moldada(Decimal("10"), niveis=0)
    ) == []
    assert not sel.selecionar_disjuntores_motor(
        corrente_nominal=Decimal("5"),
        tipo_carga=TipoCargaChoices.RESISTENCIA,
        tipo_protecao=TipoProtecaoResistenciaChoices.FUSIVEL_ULTRARRAPIDO,
    ).exists()
    assert list(
        sel.selecionar_disjuntores_motor(
            Decimal("5"),
            tipo_carga=TipoCargaChoices.RESISTENCIA,
            tipo_protecao=TipoProtecaoResistenciaChoices.DISJUNTOR_MOTOR,
            niveis=0,
        )
    ) == []

    assert list(sel.selecionar_expansoes_plc()) == []
    assert list(sel.selecionar_fontes_chaveadas()) == []
    assert list(sel.selecionar_fusiveis()) == []
    assert list(sel.selecionar_gateways()) == []
    assert list(sel.selecionar_ihms()) == []
    assert list(sel.selecionar_inversores_frequencia()) == []
    assert list(sel.selecionar_minidisjuntores(Decimal("6"), niveis=0)) == []
    assert list(sel.selecionar_modulos_comunicacao()) == []

    assert list(
        sel.selecionar_paineis(material=MaterialPainelChoices.ACO_INOX)
    ) == []
    assert list(sel.selecionar_plcs()) == []
    assert list(sel.selecionar_reles_estado_solido()) == []
    assert list(sel.selecionar_reles_interface()) == []
    assert list(sel.selecionar_reles_sobrecarga(Decimal("10"), niveis=0)) == []
    assert list(sel.selecionar_seccionadoras(Decimal("10"), niveis=0)) == []
    assert list(sel.selecionar_sinalizadores()) == []
    assert list(sel.selecionar_soft_starters()) == []
    assert list(sel.selecionar_switches_rede()) == []
    assert list(sel.selecionar_temporizadores()) == []
    assert list(sel.selecionar_trilhos_din()) == []
