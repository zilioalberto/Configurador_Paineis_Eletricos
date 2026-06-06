"""NCM exibido na tabela de investimento (perfil solução completa)."""
from __future__ import annotations

from apps.orcamentos.constants import NCM_INVESTIMENTO_PAINEL_PADRAO


def normalizar_ncm_investimento(valor: str | None, *, padrao: str = NCM_INVESTIMENTO_PAINEL_PADRAO) -> str:
    digitos = "".join(ch for ch in (valor or "") if ch.isdigit())
    return digitos or padrao


def ncm_investimento_orcamento(orcamento) -> str:
    return normalizar_ncm_investimento(getattr(orcamento, "ncm_investimento", None))
