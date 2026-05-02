"""Mínimos de bitola no painel: motor 1,5 mm²; demais cargas de potência 1,0 mm²."""

from __future__ import annotations

from decimal import Decimal
from types import SimpleNamespace

from core.choices import NumeroFasesChoices
from dimensionamento.services.circuitos.dimensionar import (
    dimensionar_motor,
    dimensionar_resistencia,
)


def _projeto_stub():
    return SimpleNamespace(
        fator_demanda=Decimal("1.00"),
        degraus_margem_bitola_condutores=0,
    )


def test_motor_corrente_baixa_forca_minimo_um_e_meio_mm2():
    espec = SimpleNamespace(
        corrente_calculada_a=Decimal("0.05"),
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    d = dimensionar_motor(espec, _projeto_stub(), SimpleNamespace(quantidade=1))
    assert d["secao_condutor_fase_mm2"] == Decimal("1.50")


def test_resistencia_corrente_baixa_forca_minimo_um_mm2():
    espec = SimpleNamespace(
        corrente_calculada_a=Decimal("0.05"),
        numero_fases=NumeroFasesChoices.TRIFASICO,
    )
    d = dimensionar_resistencia(espec, _projeto_stub(), SimpleNamespace(quantidade=1))
    assert d["secao_condutor_fase_mm2"] == Decimal("1.00")
