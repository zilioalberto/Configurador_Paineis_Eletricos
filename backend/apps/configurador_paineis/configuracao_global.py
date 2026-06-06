"""Parâmetros globais do configurador de painéis (ERP chave/valor)."""

from __future__ import annotations

CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES = "configurador.degraus_margem_bitola_condutores"
DEGRAUS_MARGEM_BITOLA_PADRAO = 1
DEGRAUS_MARGEM_BITOLA_MAX = 25


def _normalizar_degraus(raw) -> int:
    try:
        d = int(raw)
    except (TypeError, ValueError):
        d = DEGRAUS_MARGEM_BITOLA_PADRAO
    return max(0, min(d, DEGRAUS_MARGEM_BITOLA_MAX))


def obter_degraus_margem_bitola_condutores() -> int:
    """Margem de bitola aplicada ao dimensionamento de condutores (todos os painéis)."""
    from apps.configuracoes_erp.models import ParametroConfiguracao

    try:
        param = ParametroConfiguracao.objects.get(chave=CHAVE_DEGRAUS_MARGEM_BITOLA_CONDUTORES)
        return _normalizar_degraus(param.valor)
    except ParametroConfiguracao.DoesNotExist:
        return DEGRAUS_MARGEM_BITOLA_PADRAO
