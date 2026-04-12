"""Geração do código de projeto no formato MMnnn-AA (mês + sequencial + ano)."""

import re
from datetime import datetime

from django.core.exceptions import ValidationError
from django.utils import timezone

from projetos.models import Projeto

_CODIGO_AUTO = re.compile(r"^(\d{2})(\d{3})-(\d{2})$")


def _maior_sequencial_para_mes(mes: int, yy: int) -> int:
    prefix = f"{mes:02d}"
    suffix = f"-{yy:02d}"
    maior = 0
    for codigo in Projeto.objects.filter(
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
