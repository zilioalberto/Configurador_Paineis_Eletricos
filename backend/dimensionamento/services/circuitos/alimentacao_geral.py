"""
Dimensionamento do circuito de alimentação geral do painel.

Entrada: corrente_total_painel_a (ResumoDimensionamento), numero_fases,
possui_neutro e possui_terra do projeto.
"""

from __future__ import annotations

from decimal import Decimal

from core.calculos.condutores import (
    secao_fase_dimensionada_por_corrente_a,
    secao_pe_mm2_a_partir_da_fase,
)
from core.choices import NumeroFasesChoices, TipoCorrenteChoices


def _degraus_margem_bitola(projeto) -> int:
    raw = getattr(projeto, "degraus_margem_bitola_condutores", 0) or 0
    try:
        d = int(raw)
    except (TypeError, ValueError):
        d = 0
    return max(0, min(d, 25))


def _secao_ib(ib, projeto):
    return secao_fase_dimensionada_por_corrente_a(
        ib,
        degraus_acima_do_minimo_normativo=_degraus_margem_bitola(projeto),
    )


def dimensionar_circuito_alimentacao_geral(projeto, resumo) -> dict:
    ib = Decimal(getattr(resumo, "corrente_total_painel_a", None) or "0").quantize(
        Decimal("0.01")
    )

    tipo = getattr(projeto, "tipo_corrente", None) or TipoCorrenteChoices.CA
    nf = getattr(projeto, "numero_fases", None)
    possui_n = bool(getattr(projeto, "possui_neutro", False))
    possui_t = bool(getattr(projeto, "possui_terra", False))

    degraus = _degraus_margem_bitola(projeto)
    linhas: list[str] = [
        f"Corrente total do painel (resumo): {ib} A.",
        f"Tipo de corrente: {tipo}; fases (projeto): {nf}; "
        f"possui_neutro={possui_n}; possui_terra={possui_t}.",
    ]
    if degraus > 0:
        linhas.append(
            f"Margem de bitola (projeto): +{degraus} degrau(ns) na tabela comercial acima do mínimo Iz."
        )

    if tipo == TipoCorrenteChoices.CC:
        return _alimentacao_cc(ib, possui_t, linhas, projeto)

    return _alimentacao_ca(ib, nf, possui_n, possui_t, linhas, projeto)


def _alimentacao_cc(
    ib: Decimal,
    possui_t: bool,
    linhas: list[str],
    projeto,
) -> dict:
    """Alimentação em corrente contínua: dois condutores ativos + PE opcional."""
    secao = _secao_ib(ib, projeto)
    pe = secao_pe_mm2_a_partir_da_fase(secao) if possui_t else None
    linhas.append(
        "CC: 2 condutores de pólo (ex.: +/−) dimensionados pela corrente total; "
        "neutro de CA não se aplica."
    )
    if pe is not None:
        linhas.append(f"PE dimensionado a partir da seção do condutor: {pe} mm².")
    return {
        "corrente_total_painel_a": ib,
        "tipo_corrente": TipoCorrenteChoices.CC,
        "numero_fases": None,
        "possui_neutro": False,
        "possui_terra": possui_t,
        "quantidade_condutores_fase": 2,
        "quantidade_condutores_neutro": 0,
        "secao_condutor_fase_mm2": secao,
        "secao_condutor_neutro_mm2": None,
        "secao_condutor_pe_mm2": pe,
        "observacoes": "",
        "memoria_calculo": "\n".join(linhas),
    }


def _alimentacao_ca(
    ib: Decimal,
    nf: int | None,
    possui_n: bool,
    possui_t: bool,
    linhas: list[str],
    projeto,
) -> dict:
    secao_f = _secao_ib(ib, projeto)

    if nf == NumeroFasesChoices.TRIFASICO:
        q_fase = 3
        linhas.append(
            "CA trifásica: 3 condutores de fase dimensionados pela corrente total "
            "(valor já consolidado no resumo)."
        )
        secao_n = secao_f if possui_n else None
        if possui_n:
            linhas.append("Neutro: mesma seção da fase (referência simplificada).")
        pe = secao_pe_mm2_a_partir_da_fase(secao_f) if possui_t else None
        if possui_t:
            linhas.append(f"PE: {pe} mm² (relação com a seção de fase).")
        return {
            "corrente_total_painel_a": ib,
            "tipo_corrente": TipoCorrenteChoices.CA,
            "numero_fases": nf,
            "possui_neutro": possui_n,
            "possui_terra": possui_t,
            "quantidade_condutores_fase": q_fase,
            "quantidade_condutores_neutro": 1 if possui_n else 0,
            "secao_condutor_fase_mm2": secao_f,
            "secao_condutor_neutro_mm2": secao_n,
            "secao_condutor_pe_mm2": pe,
            "observacoes": "",
            "memoria_calculo": "\n".join(linhas),
        }

    if nf == NumeroFasesChoices.MONOFASICO:
        linhas.append(
            "CA monofásica: 1 condutor de fase + neutro (se previsto) + PE (se previsto)."
        )
        secao_n = secao_f if possui_n else None
        if possui_n:
            linhas.append("Neutro: mesma seção da fase.")
        pe = secao_pe_mm2_a_partir_da_fase(secao_f) if possui_t else None
        if possui_t and pe is not None:
            linhas.append(f"PE: {pe} mm².")
        return {
            "corrente_total_painel_a": ib,
            "tipo_corrente": TipoCorrenteChoices.CA,
            "numero_fases": nf,
            "possui_neutro": possui_n,
            "possui_terra": possui_t,
            "quantidade_condutores_fase": 1,
            "quantidade_condutores_neutro": 1 if possui_n else 0,
            "secao_condutor_fase_mm2": secao_f,
            "secao_condutor_neutro_mm2": secao_n,
            "secao_condutor_pe_mm2": pe,
            "observacoes": "",
            "memoria_calculo": "\n".join(linhas),
        }

    # CA sem número de fases coerente: assumir trifásico (comum em painéis industriais)
    linhas.append(
        f"Número de fases ({nf}) não tratado explicitamente; adotada regra trifásica."
    )
    return _alimentacao_ca(
        ib, NumeroFasesChoices.TRIFASICO, possui_n, possui_t, linhas, projeto
    )
