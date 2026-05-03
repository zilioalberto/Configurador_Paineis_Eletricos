"""Validação de bitolas escolhidas na alimentação geral (mínimo 2,5 mm²)."""

from decimal import Decimal

import pytest
from django.core.exceptions import ValidationError

from dimensionamento.services.circuitos.validar_escolhas import (
    validar_escolhas_alimentacao_geral,
)


def test_ag_rejeita_fase_abaixo_do_minimo():
    obj = type(
        "Ag",
        (),
        {
            "corrente_total_painel_a": Decimal("40"),
            "secao_condutor_fase_escolhida_mm2": Decimal("1.50"),
            "secao_condutor_fase_mm2": Decimal("2.50"),
            "secao_condutor_neutro_escolhida_mm2": None,
            "secao_condutor_neutro_mm2": None,
            "secao_condutor_pe_escolhida_mm2": None,
            "secao_condutor_pe_mm2": None,
            "possui_neutro": False,
            "possui_terra": False,
        },
    )()

    with pytest.raises(ValidationError) as excinfo:
        validar_escolhas_alimentacao_geral(obj)

    msg = " ".join(excinfo.value.messages)
    assert "2.5" in msg or "2,5" in msg
    assert "Fase (alimentação geral)" in msg


def test_ag_aceita_fase_no_minimo():
    obj = type(
        "Ag",
        (),
        {
            "corrente_total_painel_a": Decimal("5"),
            "secao_condutor_fase_escolhida_mm2": Decimal("2.50"),
            "secao_condutor_fase_mm2": Decimal("2.50"),
            "secao_condutor_neutro_escolhida_mm2": None,
            "secao_condutor_neutro_mm2": None,
            "secao_condutor_pe_escolhida_mm2": None,
            "secao_condutor_pe_mm2": None,
            "possui_neutro": False,
            "possui_terra": False,
        },
    )()

    validar_escolhas_alimentacao_geral(obj)
