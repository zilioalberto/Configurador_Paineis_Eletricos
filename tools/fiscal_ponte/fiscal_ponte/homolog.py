"""Homologação ponta a ponta: XML de exemplo → API (modo folder)."""
from __future__ import annotations

import shutil
from dataclasses import replace
from pathlib import Path

from .config import PonteConfig
from .sync_cycle import SyncCycleResult, executar_ciclo_sincronizacao

_HOMOLOG_ROOT = Path(__file__).resolve().parent.parent / "homolog"
_FIXTURES = _HOMOLOG_ROOT / "fixtures"
_INBOX = _HOMOLOG_ROOT / "inbox"


def preparar_inbox_homolog(*, limpar: bool = True) -> Path:
    """Copia XMLs de homolog/fixtures para homolog/inbox."""
    _INBOX.mkdir(parents=True, exist_ok=True)
    if limpar:
        for f in _INBOX.glob("*.xml"):
            f.unlink()
    if not _FIXTURES.is_dir():
        raise FileNotFoundError(f"Pasta de fixtures não encontrada: {_FIXTURES}")
    copiados = 0
    for src in sorted(_FIXTURES.glob("*.xml")):
        shutil.copy2(src, _INBOX / src.name)
        copiados += 1
    if copiados == 0:
        raise FileNotFoundError(f"Nenhum .xml em {_FIXTURES}")
    return _INBOX


def executar_homolog(
    config: PonteConfig | None = None,
    *,
    limpar_inbox: bool = True,
) -> SyncCycleResult:
    """
    Força provedor folder com homolog/inbox (ignora SEFAZ_PROVIDER do .env).
    Requer backend com FISCAL_AGENT_TOKEN e CNPJ destinatário 98765432000188 no XML de teste.
    """
    base = config or PonteConfig.from_env()
    base.validate()
    inbox = preparar_inbox_homolog(limpar=limpar_inbox)
    homolog_config = replace(
        base,
        sefaz_provider="folder",
        folder_xml=inbox,
        acbr_output_dir=None,
    )
    return executar_ciclo_sincronizacao(homolog_config)
