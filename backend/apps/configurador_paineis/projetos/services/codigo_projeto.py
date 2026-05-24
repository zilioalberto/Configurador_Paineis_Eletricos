"""Geração do código de projeto no formato MMnnn-AA (mês + sequencial + ano)."""

import re
from datetime import datetime

from django.core.exceptions import ValidationError
from django.utils import timezone

from apps.configurador_paineis.projetos.models import ProjetoConfigurador

_CODIGO_AUTO = re.compile(r"^(\d{2})(\d{3})-(\d{2})$")
_CODIGO_PROPOSTA = re.compile(r"^PROP-(\d{5}-\d{2})$", re.IGNORECASE)
_CODIGO_CONF = re.compile(r"^CONF-(\d{5}-\d{2})(?:-P(\d{2}))?$", re.IGNORECASE)


def _maior_sequencial_para_mes(mes: int, yy: int) -> int:
    """Retorna o maior sequencial nnn já usado no mês/ano (formato MMnnn-AA)."""
    prefix = f"{mes:02d}"
    suffix = f"-{yy:02d}"
    maior = 0
    for codigo in ProjetoConfigurador.objects.filter(
        codigo__startswith=prefix,
        codigo__endswith=suffix,
    ).values_list("codigo", flat=True):
        if len(codigo) != 8:
            continue
        m = _CODIGO_AUTO.match(codigo)
        if not m:
            continue
        mm, seq, y2 = int(m.group(1)), int(m.group(2)), int(m.group(3))
        if mm == mes and y2 == yy:
            maior = max(maior, seq)
    return maior


def _sufixo_numerico_proposta(codigo_base: str) -> str:
    """Extrai MMnnn-AA de Prop-05008-26 (ou PROP-05008-26)."""
    bruto = (codigo_base or "").strip().upper()
    m = _CODIGO_PROPOSTA.match(bruto)
    if not m:
        raise ValidationError(
            {
                "codigo": (
                    "Código da proposta inválido para gerar configuração "
                    "(esperado Prop-MMnnn-AA)."
                )
            }
        )
    return m.group(1)


def codigo_configurador_de_proposta(codigo_base: str, *, ordem_painel: int = 0) -> str:
    """
    Prop-05008-26 → CONF-05008-26; painéis adicionais: CONF-05008-26-P02, P03, …
    """
    sufixo = _sufixo_numerico_proposta(codigo_base)
    base = f"CONF-{sufixo}"
    if ordem_painel <= 0:
        return base
    return f"{base}-P{ordem_painel + 1:02d}"


def sugerir_codigo_configurador_de_proposta(
    codigo_base: str,
    *,
    ordem_painel: int = 0,
) -> str:
    """Código CONF alinhado à proposta; evita colisão incrementando sufixo -Pnn."""
    for offset in range(50):
        ordem = ordem_painel + offset
        candidato = codigo_configurador_de_proposta(codigo_base, ordem_painel=ordem)
        if not ProjetoConfigurador.objects.filter(codigo__iexact=candidato).exists():
            return candidato
    raise ValidationError(
        {
            "codigo": (
                "Não foi possível alocar código CONF para esta proposta "
                "(muitas configurações com o mesmo prefixo)."
            )
        }
    )


def sugerir_proximo_codigo_projeto(now: datetime | None = None) -> str:
    """
    Próximo código para o mês/ano corrente (timezone do Django), só lendo `Projeto.codigo`.
    Não grava no banco: adequado para pré-visualização na tela de novo projeto.
    """
    now = now or timezone.now()
    ano = now.year
    mes = now.month
    yy = ano % 100
    next_seq = _maior_sequencial_para_mes(mes, yy) + 1
    if next_seq > 999:
        raise ValidationError(
            {
                "codigo": "Limite de 999 projetos no mês para o código automático (MMnnn-AA)."
            }
        )
    return f"{mes:02d}{next_seq:03d}-{yy:02d}"


def _integrity_error_duplicidade_codigo_projeto(exc: BaseException) -> bool:
    """Detecta violação de unicidade do campo `codigo` (Postgres/SQLite variam na mensagem)."""
    cur: BaseException | None = exc
    for _ in range(8):
        if cur is None:
            break
        s = str(cur).lower()
        if "codigo" in s or "projetos_projeto_codigo" in s:
            return True
        cur = getattr(cur, "__cause__", None)
    return False
