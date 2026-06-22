"""Montagem de mensagens de feedback da sincronização NSU para a API."""
from __future__ import annotations

from .nsu_sync import SyncNsuResult


def montar_detail_sincronizacao(resultado: SyncNsuResult) -> str:
    partes: list[str] = []
    if resultado.mensagem:
        partes.append(resultado.mensagem)
    if resultado.ultimo_cstat:
        motivo = f" (cStat {resultado.ultimo_cstat}"
        if resultado.ultimo_motivo:
            motivo += f" — {resultado.ultimo_motivo}"
        motivo += ")"
        if not resultado.mensagem or resultado.ultimo_cstat not in resultado.mensagem:
            partes.append(motivo.strip())
    for alerta in resultado.alertas:
        if alerta and alerta not in partes:
            partes.append(alerta)
    for erro in resultado.erros_importacao[:5]:
        partes.append(erro)
    if len(resultado.erros_importacao) > 5:
        partes.append(f"… e mais {len(resultado.erros_importacao) - 5} erro(s) de importação.")
    return " ".join(partes).strip() or "Falha na sincronização com a SEFAZ."
