"""Margem em degraus da tabela comercial (acima do mínimo normativo)."""

from decimal import Decimal

import pytest

from core.calculos.condutores import (
    MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2,
    MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2,
    aplicar_minimo_bitola_painel,
    secao_comercial_deslocada_mm2,
    secao_fase_dimensionada_por_corrente_a,
    secao_fase_minima_por_corrente_a,
)


@pytest.mark.parametrize(
    ("corrente_a", "degraus", "esperado_mm2"),
    [
        (Decimal("28"), 0, Decimal("4.00")),
        (Decimal("28"), 1, Decimal("6.00")),
        (Decimal("28"), 2, Decimal("10.00")),
    ],
)
def test_secao_fase_dimensionada_28a(corrente_a, degraus, esperado_mm2):
    assert secao_fase_dimensionada_por_corrente_a(
        corrente_a,
        degraus_acima_do_minimo_normativo=degraus,
    ) == esperado_mm2


def test_sem_margem_igual_minimo_normativo():
    ib = Decimal("28")
    assert secao_fase_dimensionada_por_corrente_a(ib, degraus_acima_do_minimo_normativo=0) == secao_fase_minima_por_corrente_a(ib)


def test_deslocamento_preserva_ja_maximo():
    secao_max = secao_fase_minima_por_corrente_a(Decimal("9999"))
    assert secao_comercial_deslocada_mm2(secao_max, 5) == secao_max


def test_aplicar_minimo_painel_motor_sobe_bitola_pequena():
    assert aplicar_minimo_bitola_painel(
        Decimal("0.50"), MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2
    ) == Decimal("1.50")


def test_aplicar_minimo_painel_motor_preserva_maior():
    assert aplicar_minimo_bitola_painel(
        Decimal("2.50"), MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2
    ) == Decimal("2.50")


def test_aplicar_minimo_painel_demais_sobe_para_um_mm2():
    assert aplicar_minimo_bitola_painel(
        Decimal("0.50"), MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2
    ) == Decimal("1.00")
