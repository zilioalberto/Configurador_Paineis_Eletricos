"""Cálculo de alíquota efetiva e projeção de DAS — Simples Nacional."""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, ROUND_HALF_UP

from apps.fiscal.choices import AnexoSimplesNacionalChoices, ObjetivoSaidaFiscalChoices
from apps.fiscal.models import PerfilTributarioSimples
from apps.fiscal.services.simples_nacional_tabelas import FATOR_R_LIMITE, TABELAS_SIMPLES

QUATRO_CASAS = Decimal("0.0001")
DUAS_CASAS = Decimal("0.01")


@dataclass(frozen=True)
class FaixaCalculada:
    faixa: int
    aliquota_nominal: Decimal
    aliquota_efetiva: Decimal
    parcela_deduzir: Decimal


def _arredondar(valor: Decimal, casas: Decimal = DUAS_CASAS) -> Decimal:
    return valor.quantize(casas, rounding=ROUND_HALF_UP)


def obter_faixa(rbt12: Decimal, anexo: str) -> FaixaCalculada:
    tabela = TABELAS_SIMPLES.get(anexo)
    if not tabela:
        raise ValueError(f"Anexo inválido para cálculo: {anexo}")
    rbt = max(Decimal("0"), rbt12)
    for indice, (limite_sup, aliquota_nom, deducao) in enumerate(tabela, start=1):
        if rbt <= limite_sup:
            if rbt <= 0:
                efetiva = Decimal("0")
            else:
                efetiva = (rbt * aliquota_nom - deducao) / rbt
                efetiva = max(Decimal("0"), efetiva)
            return FaixaCalculada(
                faixa=indice,
                aliquota_nominal=aliquota_nom,
                aliquota_efetiva=_arredondar(efetiva, QUATRO_CASAS),
                parcela_deduzir=deducao,
            )
    ultima = tabela[-1]
    limite_sup, aliquota_nom, deducao = ultima
    efetiva = (limite_sup * aliquota_nom - deducao) / limite_sup
    return FaixaCalculada(
        faixa=len(tabela),
        aliquota_nominal=aliquota_nom,
        aliquota_efetiva=_arredondar(max(Decimal("0"), efetiva), QUATRO_CASAS),
        parcela_deduzir=deducao,
    )


def calcular_das(receita_mes: Decimal, rbt12_anexo: Decimal, anexo: str) -> Decimal:
    if receita_mes <= 0:
        return Decimal("0")
    faixa = obter_faixa(rbt12_anexo, anexo)
    return _arredondar(receita_mes * faixa.aliquota_efetiva)


def calcular_fator_r(
    perfil: PerfilTributarioSimples,
    receita_servicos_12m: Decimal,
) -> Decimal | None:
    if receita_servicos_12m <= 0:
        return None
    folha_total = perfil.folha_salarios_12m + perfil.encargos_folha_12m
    return _arredondar(folha_total / receita_servicos_12m, QUATRO_CASAS)


def resolver_anexo_servicos(
    perfil: PerfilTributarioSimples,
    receita_servicos_12m: Decimal,
) -> str:
    override = (perfil.anexo_servicos_override or "").strip()
    if override in {AnexoSimplesNacionalChoices.III, AnexoSimplesNacionalChoices.V}:
        return override
    fator_r = calcular_fator_r(perfil, receita_servicos_12m)
    if fator_r is None:
        return AnexoSimplesNacionalChoices.III
    if fator_r >= FATOR_R_LIMITE:
        return AnexoSimplesNacionalChoices.III
    return AnexoSimplesNacionalChoices.V


def resolver_anexo_documento(
    *,
    anexo_simples: str,
    objetivo_saida: str,
    perfil: PerfilTributarioSimples,
    receita_servicos_12m: Decimal,
) -> str | None:
    if not anexo_simples:
        if objetivo_saida == ObjetivoSaidaFiscalChoices.PRESTACAO_SERVICO:
            return resolver_anexo_servicos(perfil, receita_servicos_12m)
        return None
    if anexo_simples == AnexoSimplesNacionalChoices.NENHUM:
        return None
    return anexo_simples
