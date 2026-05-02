"""Validação de bitolas escolhidas pelo utilizador (Iz mínimo e relação PE)."""

from __future__ import annotations

from decimal import Decimal

from django.core.exceptions import ValidationError

from core.calculos.condutores import (
    MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2,
    MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2,
    capacidade_nominal_iz_a,
    secao_comercial_valida,
    secao_pe_mm2_a_partir_da_fase,
)
from core.choices import TipoCargaChoices
from dimensionamento.models import ClassificacaoCircuitoChoices


def _minimo_bitola_painel_fase_mm2(tipo_carga: str | None) -> Decimal:
    if tipo_carga == TipoCargaChoices.MOTOR:
        return MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2
    return MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2


def _ib_fase_circuito_carga(obj) -> Decimal:
    v = obj.corrente_projeto_a or obj.corrente_calculada_a
    if v is None:
        return Decimal("0")
    return Decimal(v)


def _ef_mm2(escolhida, sugerida):
    if escolhida is not None:
        return Decimal(escolhida)
    if sugerida is not None:
        return Decimal(sugerida)
    return None


def validar_escolhas_circuito_carga(obj) -> None:
    """Levanta ValidationError se as escolhas não cumprirem critérios."""
    erros = []

    def checar_secao(campo: str, secao, nome: str):
        if secao is None:
            return
        if not secao_comercial_valida(Decimal(secao)):
            erros.append(f"{nome}: seção {secao} mm² não é valor comercial da tabela.")

    checar_secao(
        "fase",
        obj.secao_condutor_fase_escolhida_mm2,
        "Fase",
    )
    checar_secao(
        "neutro",
        obj.secao_condutor_neutro_escolhida_mm2,
        "Neutro",
    )
    checar_secao("pe", obj.secao_condutor_pe_escolhida_mm2, "PE")

    if erros:
        raise ValidationError(erros)

    ib = _ib_fase_circuito_carga(obj)
    classif = obj.classificacao_circuito

    ef_fase = _ef_mm2(obj.secao_condutor_fase_escolhida_mm2, obj.secao_condutor_fase_mm2)
    if ef_fase is not None and getattr(obj, "tipo_carga", None):
        min_projeto = _minimo_bitola_painel_fase_mm2(obj.tipo_carga)
        if ef_fase < min_projeto:
            erros.append(
                f"Fase: seção mínima de projeto no painel para este tipo de carga é "
                f"{min_projeto} mm²."
            )

    if ef_fase is not None:
        iz = capacidade_nominal_iz_a(ef_fase)
        if iz is None:
            erros.append("Fase: seção inválida.")
        elif classif == ClassificacaoCircuitoChoices.POTENCIA and ib > 0 and iz < ib:
            erros.append(
                f"Fase: Iz ({iz} A) da seção escolhida é inferior à corrente de referência ({ib} A)."
            )

    if obj.possui_neutro:
        ef_n = _ef_mm2(
            obj.secao_condutor_neutro_escolhida_mm2,
            obj.secao_condutor_neutro_mm2,
        )
        if ef_n is not None and getattr(obj, "tipo_carga", None):
            min_projeto = _minimo_bitola_painel_fase_mm2(obj.tipo_carga)
            if ef_n < min_projeto:
                erros.append(
                    f"Neutro: seção mínima de projeto no painel para este tipo de carga é "
                    f"{min_projeto} mm²."
                )
        if ef_n is not None:
            izn = capacidade_nominal_iz_a(ef_n)
            if izn is None:
                erros.append("Neutro: seção inválida.")
            elif classif == ClassificacaoCircuitoChoices.POTENCIA and ib > 0 and izn < ib:
                erros.append(
                    f"Neutro: Iz ({izn} A) inferior à corrente de referência ({ib} A)."
                )

    if obj.possui_pe:
        ef_pe = _ef_mm2(obj.secao_condutor_pe_escolhida_mm2, obj.secao_condutor_pe_mm2)
        if ef_pe is not None and ef_fase is not None:
            pe_min = secao_pe_mm2_a_partir_da_fase(ef_fase)
            if ef_pe < pe_min:
                erros.append(
                    f"PE: seção mínima para a fase efetiva ({ef_fase} mm²) é {pe_min} mm²."
                )

    if erros:
        raise ValidationError(erros)


def validar_escolhas_alimentacao_geral(obj) -> None:
    erros = []
    ib = Decimal(obj.corrente_total_painel_a or "0")

    def checar(campo, secao, nome):
        if secao is None:
            return
        if not secao_comercial_valida(Decimal(secao)):
            erros.append(f"{nome}: seção não comercial.")

    checar("f", obj.secao_condutor_fase_escolhida_mm2, "Fase alimentação geral")
    checar("n", obj.secao_condutor_neutro_escolhida_mm2, "Neutro")
    checar("p", obj.secao_condutor_pe_escolhida_mm2, "PE")

    if erros:
        raise ValidationError(erros)

    ef_fase = _ef_mm2(
        obj.secao_condutor_fase_escolhida_mm2,
        obj.secao_condutor_fase_mm2,
    )
    if ef_fase is not None and ib > 0:
        iz = capacidade_nominal_iz_a(ef_fase)
        if iz is None:
            erros.append("Fase: seção inválida.")
        elif iz < ib:
            erros.append(
                f"Fase: Iz ({iz} A) inferior à corrente total do painel ({ib} A)."
            )

    if obj.possui_neutro:
        ef_n = _ef_mm2(
            obj.secao_condutor_neutro_escolhida_mm2,
            obj.secao_condutor_neutro_mm2,
        )
        if ef_n is not None and ib > 0:
            izn = capacidade_nominal_iz_a(ef_n)
            if izn is None:
                erros.append("Neutro: seção inválida.")
            elif izn < ib:
                erros.append(
                    f"Neutro: Iz ({izn} A) inferior à corrente total ({ib} A)."
                )

    if obj.possui_terra:
        ef_pe = _ef_mm2(
            obj.secao_condutor_pe_escolhida_mm2,
            obj.secao_condutor_pe_mm2,
        )
        if ef_pe is not None and ef_fase is not None:
            pe_min = secao_pe_mm2_a_partir_da_fase(ef_fase)
            if ef_pe < pe_min:
                erros.append(
                    f"PE: seção mínima para fase {ef_fase} mm² é {pe_min} mm²."
                )

    if erros:
        raise ValidationError(erros)
