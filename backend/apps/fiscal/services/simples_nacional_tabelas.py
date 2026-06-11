"""Tabelas de alíquotas do Simples Nacional (LC 123/2006 — vigência 2018+)."""
from __future__ import annotations

from decimal import Decimal

from apps.fiscal.choices import AnexoSimplesNacionalChoices

FaixaSimples = tuple[Decimal, Decimal, Decimal, Decimal]


def _faixa(limite_sup: str, aliquota_pct: str, deducao: str) -> FaixaSimples:
    return (
        Decimal(limite_sup),
        Decimal(aliquota_pct) / Decimal("100"),
        Decimal(deducao),
    )


# (limite_superior_rbt12, aliquota_nominal, parcela_deduzir)
TABELAS_SIMPLES: dict[str, list[FaixaSimples]] = {
    AnexoSimplesNacionalChoices.I: [
        _faixa("180000", "4.00", "0"),
        _faixa("360000", "7.30", "5940"),
        _faixa("720000", "9.50", "13860"),
        _faixa("1800000", "10.70", "22500"),
        _faixa("3600000", "14.30", "87300"),
        _faixa("4800000", "19.00", "378000"),
    ],
    AnexoSimplesNacionalChoices.II: [
        _faixa("180000", "4.50", "0"),
        _faixa("360000", "7.80", "5940"),
        _faixa("720000", "10.00", "13860"),
        _faixa("1800000", "11.20", "22500"),
        _faixa("3600000", "14.70", "87300"),
        _faixa("4800000", "30.00", "720000"),
    ],
    AnexoSimplesNacionalChoices.III: [
        _faixa("180000", "6.00", "0"),
        _faixa("360000", "11.20", "9360"),
        _faixa("720000", "13.50", "17640"),
        _faixa("1800000", "16.00", "35640"),
        _faixa("3600000", "21.00", "125640"),
        _faixa("4800000", "33.00", "648000"),
    ],
    AnexoSimplesNacionalChoices.V: [
        _faixa("180000", "15.50", "0"),
        _faixa("360000", "18.00", "4500"),
        _faixa("720000", "19.50", "9900"),
        _faixa("1800000", "20.50", "17100"),
        _faixa("3600000", "23.00", "62100"),
        _faixa("4800000", "30.50", "540000"),
    ],
}

FATOR_R_LIMITE = Decimal("0.28")
