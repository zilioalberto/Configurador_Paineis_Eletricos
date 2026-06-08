"""Parâmetros globais do configurador de painéis (ERP chave/valor)."""

from __future__ import annotations

from decimal import Decimal

CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES = "configurador.degraus_margem_bitola_condutores"
CHAVE_TAXA_OCUPACAO_MAX_PLACA = "configurador.taxa_ocupacao_max_placa_percentual"
CHAVE_FOLGA_PROFUNDIDADE_PAINEL_MM = "configurador.folga_profundidade_painel_mm"
CHAVE_MARGEM_PLACA_MM = "configurador.margem_placa_mm"
CHAVE_ESPACAMENTO_MAX_CANALETAS_HORIZONTAL_MM = (
    "configurador.espacamento_max_canaletas_horizontal_mm"
)

DEGRAUS_MARGEM_BITOLA_PADRAO = 1
DEGRAUS_MARGEM_BITOLA_MAX = 25
TAXA_OCUPACAO_MAX_PLACA_PADRAO = Decimal("80.00")
FOLGA_PROFUNDIDADE_PAINEL_PADRAO_MM = 30
MARGEM_PLACA_PADRAO_MM = 20
ESPACAMENTO_MAX_CANALETAS_HORIZONTAL_PADRAO_MM = 160
CANALETAS_VERTICAIS_PADRAO = 2


def _normalizar_degraus(raw) -> int:
    try:
        d = int(raw)
    except (TypeError, ValueError):
        d = DEGRAUS_MARGEM_BITOLA_PADRAO
    return max(0, min(d, DEGRAUS_MARGEM_BITOLA_MAX))


def _obter_parametro_decimal(chave: str, padrao: Decimal) -> Decimal:
    from apps.configuracoes_erp.models import ParametroConfiguracao

    try:
        param = ParametroConfiguracao.objects.get(chave=chave)
        return Decimal(str(param.valor).replace(",", "."))
    except (ParametroConfiguracao.DoesNotExist, Exception):
        return padrao


def _obter_parametro_inteiro(chave: str, padrao: int) -> int:
    from apps.configuracoes_erp.models import ParametroConfiguracao

    try:
        param = ParametroConfiguracao.objects.get(chave=chave)
        return int(param.valor)
    except (ParametroConfiguracao.DoesNotExist, TypeError, ValueError):
        return padrao


def obter_degraus_margem_bitola_condutores() -> int:
    """Margem de bitola aplicada ao dimensionamento de condutores (todos os painéis)."""
    from apps.configuracoes_erp.models import ParametroConfiguracao

    try:
        param = ParametroConfiguracao.objects.get(chave=CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES)
        return _normalizar_degraus(param.valor)
    except ParametroConfiguracao.DoesNotExist:
        return DEGRAUS_MARGEM_BITOLA_PADRAO


def obter_taxa_ocupacao_max_placa_percentual() -> Decimal:
    """Ocupação máxima admissível da placa (ex.: 80 → placa mínima = área / 0,80)."""
    taxa = _obter_parametro_decimal(CHAVE_TAXA_OCUPACAO_MAX_PLACA, TAXA_OCUPACAO_MAX_PLACA_PADRAO)
    if taxa <= 0 or taxa > 100:
        return TAXA_OCUPACAO_MAX_PLACA_PADRAO
    return taxa.quantize(Decimal("0.01"))


def obter_folga_profundidade_painel_mm() -> int:
    return max(0, _obter_parametro_inteiro(CHAVE_FOLGA_PROFUNDIDADE_PAINEL_MM, FOLGA_PROFUNDIDADE_PAINEL_PADRAO_MM))


def obter_margem_placa_mm() -> int:
    return max(0, _obter_parametro_inteiro(CHAVE_MARGEM_PLACA_MM, MARGEM_PLACA_PADRAO_MM))


def obter_espacamento_max_canaletas_horizontal_mm() -> int:
    """Faixa vertical máxima entre canaletas horizontais antes de inserir outra peça."""
    valor = _obter_parametro_inteiro(
        CHAVE_ESPACAMENTO_MAX_CANALETAS_HORIZONTAL_MM,
        ESPACAMENTO_MAX_CANALETAS_HORIZONTAL_PADRAO_MM,
    )
    return max(40, valor)
