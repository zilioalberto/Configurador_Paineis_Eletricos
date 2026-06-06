"""Log em ficheiro para serviço Windows / tarefa agendada."""
from __future__ import annotations

import logging
from pathlib import Path

from .config import _PONTE_ROOT


def configurar_logging(
    *,
    verbose: bool = False,
    log_dir: Path | None = None,
) -> Path | None:
    level = logging.DEBUG if verbose else logging.INFO
    formato = "%(asctime)s %(levelname)s %(name)s — %(message)s"
    logging.basicConfig(level=level, format=formato, force=True)

    destino = log_dir
    if destino is None:
        raw = (__import__("os").getenv("FISCAL_PONTE_LOG_DIR") or "").strip()
        if raw:
            destino = Path(raw)
        else:
            destino = _PONTE_ROOT / "logs"

    try:
        destino.mkdir(parents=True, exist_ok=True)
    except OSError:
        return None

    log_path = destino / "fiscal_ponte.log"
    handler = logging.FileHandler(log_path, encoding="utf-8")
    handler.setLevel(level)
    handler.setFormatter(logging.Formatter(formato))
    logging.getLogger().addHandler(handler)
    return log_path
