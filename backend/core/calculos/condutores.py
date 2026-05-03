"""
Dimensionamento preliminar de seções de condutores de cobre, PVC, método B1
(3 condutores carregados) — valores de referência simplificados (A).

Condutor de proteção (PE): relação mínima com a seção da fase conforme
NBR 5410 (6.4.3.1.2), com arredondamento para seção comercial.
"""

from __future__ import annotations

from decimal import Decimal

# (seção mm², capacidade de condução Iz aprox. A) — crescente por seção
_TABELA_AZ_TRIFASICO: list[tuple[Decimal, float]] = [
    (Decimal("0.50"), 7.0),
    (Decimal("0.75"), 9.0),
    (Decimal("1.00"), 12.0),
    (Decimal("1.50"), 15.5),
    (Decimal("2.50"), 21.0),
    (Decimal("4.00"), 28.0),
    (Decimal("6.00"), 36.0),
    (Decimal("10.00"), 50.0),
    (Decimal("16.00"), 68.0),
    (Decimal("25.00"), 89.0),
    (Decimal("35.00"), 110.0),
    (Decimal("50.00"), 134.0),
    (Decimal("70.00"), 171.0),
    (Decimal("95.00"), 207.0),
    (Decimal("120.00"), 239.0),
    (Decimal("150.00"), 262.0),
    (Decimal("185.00"), 296.0),
    (Decimal("240.00"), 346.0),
    (Decimal("300.00"), 394.0),
    (Decimal("400.00"), 455.0),
    (Decimal("500.00"), 520.0),
    (Decimal("630.00"), 590.0),
]

_SECOES_COMERCIAIS_MM2: list[Decimal] = [s for s, _ in _TABELA_AZ_TRIFASICO]

# Mínimos de bitola de condutores **internos ao painel** (projeto), além do mínimo
# normativo da tabela Iz: motores 1,5 mm²; demais tipos de carga 1,0 mm².
MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2: Decimal = Decimal("1.50")
MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2: Decimal = Decimal("1.00")


def aplicar_minimo_bitola_painel(secao_mm2: Decimal, minimo_mm2: Decimal) -> Decimal:
    """Garante seção comercial não inferior ao mínimo de projeto no painel."""
    x = max(Decimal(secao_mm2), Decimal(minimo_mm2))
    return proxima_secao_comercial_mm2(x)


def proxima_secao_comercial_mm2(secao: Decimal) -> Decimal:
    """Menor seção padronizada maior ou igual a `secao`."""
    x = Decimal(secao)
    for s in _SECOES_COMERCIAIS_MM2:
        if s >= x:
            return s
    return _SECOES_COMERCIAIS_MM2[-1]


def secao_fase_minima_por_corrente_a(corrente_a: Decimal) -> Decimal:
    """
    Seção mínima de fase/borne cuja capacidade de condução cobre a corrente
    de projeto (valor já dimensionador).
    """
    ic = float(corrente_a)
    if ic <= 0:
        return Decimal("1.00")
    for secao, iz in _TABELA_AZ_TRIFASICO:
        if iz >= ic:
            return secao
    return _SECOES_COMERCIAIS_MM2[-1]


def _indice_secao_comercial_mm2(secao: Decimal) -> int:
    """Índice na lista de seções padronizadas (0 = menor bitola da tabela)."""
    s = Decimal(secao)
    for i, sc in enumerate(_SECOES_COMERCIAIS_MM2):
        if sc == s:
            return i
    for i, sc in enumerate(_SECOES_COMERCIAIS_MM2):
        if sc >= s:
            return i
    return len(_SECOES_COMERCIAIS_MM2) - 1


def secao_comercial_deslocada_mm2(
    secao_referencia: Decimal,
    degraus_acima: int,
) -> Decimal:
    """
    Avança N posições na lista de bitolas comerciais (ex.: 1 = «uma bitola acima»).

    Útil como margem de engenharia sobre o mínimo normativo da tabela Iz.
    """
    if degraus_acima <= 0:
        return Decimal(secao_referencia)
    i = _indice_secao_comercial_mm2(Decimal(secao_referencia))
    j = min(i + int(degraus_acima), len(_SECOES_COMERCIAIS_MM2) - 1)
    return _SECOES_COMERCIAIS_MM2[j]


def secao_fase_dimensionada_por_corrente_a(
    corrente_a: Decimal,
    *,
    degraus_acima_do_minimo_normativo: int = 0,
) -> Decimal:
    """
    Bitola de fase para a corrente indicada: mínimo normativo + opcionalmente
    degraus extras na tabela comercial (margem de projeto).
    """
    base = secao_fase_minima_por_corrente_a(corrente_a)
    return secao_comercial_deslocada_mm2(base, degraus_acima_do_minimo_normativo)


def secao_pe_mm2_a_partir_da_fase(secao_fase_mm2: Decimal) -> Decimal:
    """
    PE de proteção — NBR 5410 simplificado:
    - S ≤ 16 mm² → Sp = S
    - 16 < S ≤ 35 mm² → Sp = 16 mm²
    - S > 35 mm² → Sp = S / 2 (ajustado para seção comercial ≥ valor calculado)
    """
    sf = Decimal(secao_fase_mm2)
    if sf <= Decimal("16"):
        return proxima_secao_comercial_mm2(sf)
    if sf <= Decimal("35"):
        return Decimal("16.00")
    req = sf / Decimal("2")
    return proxima_secao_comercial_mm2(req)


def fixo_um_mm2() -> Decimal:
    return Decimal("1.00")


def capacidade_nominal_iz_a(secao_mm2: Decimal) -> Decimal | None:
    """Corrente Iz (A) para uma seção comercial exata da tabela; senão None."""
    s = Decimal(secao_mm2)
    for secao, iz in _TABELA_AZ_TRIFASICO:
        if secao == s:
            return Decimal(str(iz))
    return None


def listar_secoes_comerciais_mm2() -> list[str]:
    """Valores padronizados para seleção em UI (strings decimais estáveis)."""
    return [str(s) for s in _SECOES_COMERCIAIS_MM2]


def tabela_referencia_condutores_iz() -> list[dict[str, str]]:
    """
    Tabela (seção mm², Iz A) exposta à API/frontend para filtrar opções válidas.
    """
    return [
        {"secao_mm2": str(s), "iz_a": str(iz)} for s, iz in _TABELA_AZ_TRIFASICO
    ]


def secao_comercial_valida(secao: Decimal) -> bool:
    return any(secao == s for s, _ in _TABELA_AZ_TRIFASICO)
