"""
Regras de dimensionamento de condutores internos ao painel por tipo de carga.
"""

from __future__ import annotations

from decimal import Decimal

from core.calculos.condutores import (
    MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2,
    MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2,
    aplicar_minimo_bitola_painel,
    fixo_um_mm2,
    secao_fase_dimensionada_por_corrente_a,
    secao_pe_mm2_a_partir_da_fase,
)
from core.choices import (
    NumeroFasesChoices,
    TipoCargaChoices,
    TipoCorrenteChoices,
    TipoSinalChoices,
)
from dimensionamento.models import ClassificacaoCircuitoChoices

def _fd(projeto) -> Decimal:
    fd = getattr(projeto, "fator_demanda", None)
    if fd is None:
        return Decimal("1.00")
    return Decimal(fd)


def _degraus_margem_bitola(projeto) -> int:
    raw = getattr(projeto, "degraus_margem_bitola_condutores", 0) or 0
    try:
        d = int(raw)
    except (TypeError, ValueError):
        d = 0
    return max(0, min(d, 25))


def _secao_fase_por_corrente(corrente: Decimal, projeto) -> Decimal:
    return secao_fase_dimensionada_por_corrente_a(
        corrente,
        degraus_acima_do_minimo_normativo=_degraus_margem_bitola(projeto),
    )


def _qtd_unidades(carga) -> int:
    q = getattr(carga, "quantidade", 1) or 1
    try:
        return max(1, int(q))
    except (TypeError, ValueError):
        return 1


def _corrente_de_especificacao(espec) -> Decimal | None:
    corrente_calc = getattr(espec, "corrente_calculada_a", None)
    if corrente_calc is not None:
        return Decimal(corrente_calc)

    corrente_ma = getattr(espec, "corrente_consumida_ma", None)
    if corrente_ma is not None:
        return Decimal(corrente_ma) / Decimal("1000")

    return None


def dimensionar_motor(espec_motor, projeto, carga) -> dict:
    corrente_u = _corrente_de_especificacao(espec_motor)
    if corrente_u is None:
        corrente_u = Decimal("0")

    qtd = _qtd_unidades(carga)
    fd = _fd(projeto)
    corrente_projeto = (corrente_u * Decimal(qtd) * fd).quantize(Decimal("0.01"))

    nf = getattr(espec_motor, "numero_fases", None)
    trifasico = nf == NumeroFasesChoices.TRIFASICO

    linhas = [
        f"Motor: Ib_unidade={corrente_u} A; quantidade={qtd}; fator_demanda={fd}; Ib_projeto={corrente_projeto} A.",
    ]
    _dg = _degraus_margem_bitola(projeto)
    if _dg > 0:
        linhas.append(
            f"Margem de bitola (projeto): +{_dg} degrau(ns) na tabela comercial acima do mínimo normativo."
        )

    if trifasico:
        secao_f = _secao_fase_por_corrente(corrente_projeto, projeto)
        secao_f = aplicar_minimo_bitola_painel(
            secao_f, MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2
        )
        secao_pe = secao_pe_mm2_a_partir_da_fase(secao_f)
        linhas.append(
            "Trifásico: 3 condutores de fase + PE; neutro não aplicável."
        )
        linhas.append(
            f"Bitola mínima no painel (motor): {MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2} mm²."
        )
        return {
            "tipo_carga": TipoCargaChoices.MOTOR,
            "classificacao_circuito": ClassificacaoCircuitoChoices.POTENCIA,
            "corrente_calculada_a": corrente_u,
            "corrente_projeto_a": corrente_projeto,
            "quantidade_condutores_fase": 3,
            "quantidade_condutores_comando": 0,
            "quantidade_condutores_sinal": 0,
            "possui_neutro": False,
            "possui_pe": True,
            "secao_condutor_fase_mm2": secao_f,
            "secao_condutor_neutro_mm2": None,
            "secao_condutor_pe_mm2": secao_pe,
            "observacoes": "",
            "memoria_calculo": "\n".join(linhas),
        }

    secao_f = _secao_fase_por_corrente(corrente_projeto, projeto)
    secao_f = aplicar_minimo_bitola_painel(
        secao_f, MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2
    )
    secao_pe = secao_pe_mm2_a_partir_da_fase(secao_f)
    linhas.append(
        "Monofásico: 1 fase + neutro (mesma seção da fase) + PE."
    )
    linhas.append(
        f"Bitola mínima no painel (motor): {MINIMO_SECAO_CONDUTOR_PAINEL_MOTOR_MM2} mm²."
    )
    return {
        "tipo_carga": TipoCargaChoices.MOTOR,
        "classificacao_circuito": ClassificacaoCircuitoChoices.POTENCIA,
        "corrente_calculada_a": corrente_u,
        "corrente_projeto_a": corrente_projeto,
        "quantidade_condutores_fase": 1,
        "quantidade_condutores_comando": 0,
        "quantidade_condutores_sinal": 0,
        "possui_neutro": True,
        "possui_pe": True,
        "secao_condutor_fase_mm2": secao_f,
        "secao_condutor_neutro_mm2": secao_f,
        "secao_condutor_pe_mm2": secao_pe,
        "observacoes": "",
        "memoria_calculo": "\n".join(linhas),
    }


def dimensionar_resistencia(espec, projeto, carga) -> dict:
    corrente_u = _corrente_de_especificacao(espec)
    if corrente_u is None:
        corrente_u = Decimal("0")

    qtd = _qtd_unidades(carga)
    fd = _fd(projeto)
    corrente_projeto = (corrente_u * Decimal(qtd) * fd).quantize(Decimal("0.01"))

    nf = getattr(espec, "numero_fases", None)
    trifasico = nf == NumeroFasesChoices.TRIFASICO

    linhas = [
        f"Resistência: Ib_unidade={corrente_u} A; quantidade={qtd}; fd={fd}; Ib_projeto={corrente_projeto} A.",
    ]
    _dgr = _degraus_margem_bitola(projeto)
    if _dgr > 0:
        linhas.append(
            f"Margem de bitola (projeto): +{_dgr} degrau(ns) na tabela comercial acima do mínimo normativo."
        )

    if trifasico:
        secao_f = _secao_fase_por_corrente(corrente_projeto, projeto)
        secao_f = aplicar_minimo_bitola_painel(
            secao_f, MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2
        )
        secao_pe = secao_pe_mm2_a_partir_da_fase(secao_f)
        linhas.append("Trifásico: 3F + PE.")
        linhas.append(
            f"Bitola mínima no painel (carga): {MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2} mm²."
        )
        return {
            "tipo_carga": TipoCargaChoices.RESISTENCIA,
            "classificacao_circuito": ClassificacaoCircuitoChoices.POTENCIA,
            "corrente_calculada_a": corrente_u,
            "corrente_projeto_a": corrente_projeto,
            "quantidade_condutores_fase": 3,
            "quantidade_condutores_comando": 0,
            "quantidade_condutores_sinal": 0,
            "possui_neutro": False,
            "possui_pe": True,
            "secao_condutor_fase_mm2": secao_f,
            "secao_condutor_neutro_mm2": None,
            "secao_condutor_pe_mm2": secao_pe,
            "observacoes": "",
            "memoria_calculo": "\n".join(linhas),
        }

    secao_f = _secao_fase_por_corrente(corrente_projeto, projeto)
    secao_f = aplicar_minimo_bitola_painel(
        secao_f, MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2
    )
    secao_pe = secao_pe_mm2_a_partir_da_fase(secao_f)
    linhas.append("Monofásico: 1F + N + PE (N igual à fase).")
    linhas.append(
        f"Bitola mínima no painel (carga): {MINIMO_SECAO_CONDUTOR_PAINEL_DEMAIS_MM2} mm²."
    )
    return {
        "tipo_carga": TipoCargaChoices.RESISTENCIA,
        "classificacao_circuito": ClassificacaoCircuitoChoices.POTENCIA,
        "corrente_calculada_a": corrente_u,
        "corrente_projeto_a": corrente_projeto,
        "quantidade_condutores_fase": 1,
        "quantidade_condutores_comando": 0,
        "quantidade_condutores_sinal": 0,
        "possui_neutro": True,
        "possui_pe": True,
        "secao_condutor_fase_mm2": secao_f,
        "secao_condutor_neutro_mm2": secao_f,
        "secao_condutor_pe_mm2": secao_pe,
        "observacoes": "",
        "memoria_calculo": "\n".join(linhas),
    }


def dimensionar_valvula(espec, projeto, carga) -> dict:
    corrente_u = _corrente_de_especificacao(espec)
    secao = fixo_um_mm2()
    cc = getattr(espec, "tipo_corrente", None) == TipoCorrenteChoices.CC
    possui_neutro = not cc
    linhas = [
        "Válvula: circuito de comando; bitola fixa 1 mm² (não dimensiona por corrente de carga).",
        f"Corrente indicativa da bobina: {corrente_u} A (referência).",
        "Dois condutores de comando registrados em quantidade_condutores_fase=2 (uso interno).",
    ]
    sn = secao if possui_neutro else None
    return {
        "tipo_carga": TipoCargaChoices.VALVULA,
        "classificacao_circuito": ClassificacaoCircuitoChoices.COMANDO,
        "corrente_calculada_a": corrente_u,
        "corrente_projeto_a": None,
        "quantidade_condutores_fase": 2,
        "quantidade_condutores_comando": 2,
        "quantidade_condutores_sinal": 0,
        "possui_neutro": possui_neutro,
        "possui_pe": False,
        "secao_condutor_fase_mm2": secao,
        "secao_condutor_neutro_mm2": sn,
        "secao_condutor_pe_mm2": None,
        "observacoes": "PE apenas em válvulas especiais com aterramento próprio (não previsto na regra padrão).",
        "memoria_calculo": "\n".join(linhas),
    }


def dimensionar_sensor(espec, projeto, carga) -> dict:
    corrente_u = _corrente_de_especificacao(espec)
    tipo_sinal = getattr(espec, "tipo_sinal", None)
    secao = fixo_um_mm2()

    if tipo_sinal == TipoSinalChoices.DIGITAL:
        linhas = [
            "Sensor digital: 3 condutores (+24 Vcc, 0 Vcc, sinal); bitola mínima 1 mm².",
            f"Corrente indicativa: {corrente_u} A.",
        ]
        return {
            "tipo_carga": TipoCargaChoices.SENSOR,
            "classificacao_circuito": ClassificacaoCircuitoChoices.SINAL,
            "corrente_calculada_a": corrente_u,
            "corrente_projeto_a": None,
            "quantidade_condutores_fase": 3,
            "quantidade_condutores_comando": 0,
            "quantidade_condutores_sinal": 3,
            "possui_neutro": False,
            "possui_pe": False,
            "secao_condutor_fase_mm2": secao,
            "secao_condutor_neutro_mm2": None,
            "secao_condutor_pe_mm2": None,
            "observacoes": "",
            "memoria_calculo": "\n".join(linhas),
        }

    linhas = [
        "Sensor analógico: condutores de sinal/alimentação + referência PE/blindagem (1 mm² na v1).",
        f"Corrente indicativa: {corrente_u} A.",
    ]
    return {
        "tipo_carga": TipoCargaChoices.SENSOR,
        "classificacao_circuito": ClassificacaoCircuitoChoices.SINAL,
        "corrente_calculada_a": corrente_u,
        "corrente_projeto_a": None,
        "quantidade_condutores_fase": 3,
        "quantidade_condutores_comando": 0,
        "quantidade_condutores_sinal": 3,
        "possui_neutro": False,
        "possui_pe": True,
        "secao_condutor_fase_mm2": secao,
        "secao_condutor_neutro_mm2": None,
        "secao_condutor_pe_mm2": secao,
        "observacoes": "Em campo, o ‘PE’ pode ser blindagem/dreno — evoluir para terra funcional vs PE.",
        "memoria_calculo": "\n".join(linhas),
    }


def dimensionar_transdutor(espec, projeto, carga) -> dict:
    corrente_u = _corrente_de_especificacao(espec)
    secao = fixo_um_mm2()
    linhas = [
        "Transdutor: regra genérica v1 — 3 condutores + PE; bitola mínima 1 mm².",
        f"Corrente indicativa: {corrente_u} A.",
    ]
    return {
        "tipo_carga": TipoCargaChoices.TRANSDUTOR,
        "classificacao_circuito": ClassificacaoCircuitoChoices.SINAL,
        "corrente_calculada_a": corrente_u,
        "corrente_projeto_a": None,
        "quantidade_condutores_fase": 3,
        "quantidade_condutores_comando": 0,
        "quantidade_condutores_sinal": 3,
        "possui_neutro": False,
        "possui_pe": True,
        "secao_condutor_fase_mm2": secao,
        "secao_condutor_neutro_mm2": None,
        "secao_condutor_pe_mm2": secao,
        "observacoes": "",
        "memoria_calculo": "\n".join(linhas),
    }


def dimensionar_transmissor(projeto, carga) -> dict:
    secao = fixo_um_mm2()
    linhas = [
        "Transmissor (sem especificação detalhada): 2 condutores + PE; 1 mm² — evoluir por tipo de sinal.",
    ]
    return {
        "tipo_carga": TipoCargaChoices.TRANSMISSOR,
        "classificacao_circuito": ClassificacaoCircuitoChoices.SINAL,
        "corrente_calculada_a": None,
        "corrente_projeto_a": None,
        "quantidade_condutores_fase": 2,
        "quantidade_condutores_comando": 0,
        "quantidade_condutores_sinal": 2,
        "possui_neutro": False,
        "possui_pe": True,
        "secao_condutor_fase_mm2": secao,
        "secao_condutor_neutro_mm2": None,
        "secao_condutor_pe_mm2": secao,
        "observacoes": "",
        "memoria_calculo": "\n".join(linhas),
    }


def dimensionar_circuito_para_carga(carga, projeto) -> dict | None:
    tipo = carga.tipo
    if tipo == TipoCargaChoices.MOTOR:
        espec = getattr(carga, "motor", None)
        if not espec:
            return None
        return dimensionar_motor(espec, projeto, carga)
    if tipo == TipoCargaChoices.RESISTENCIA:
        espec = getattr(carga, "resistencia", None)
        if not espec:
            return None
        return dimensionar_resistencia(espec, projeto, carga)
    if tipo == TipoCargaChoices.VALVULA:
        espec = getattr(carga, "valvula", None)
        if not espec:
            return None
        return dimensionar_valvula(espec, projeto, carga)
    if tipo == TipoCargaChoices.SENSOR:
        espec = getattr(carga, "sensor", None)
        if not espec:
            return None
        return dimensionar_sensor(espec, projeto, carga)
    if tipo == TipoCargaChoices.TRANSDUTOR:
        espec = getattr(carga, "transdutor", None)
        if not espec:
            return None
        return dimensionar_transdutor(espec, projeto, carga)
    if tipo == TipoCargaChoices.TRANSMISSOR:
        return dimensionar_transmissor(projeto, carga)
    return None
