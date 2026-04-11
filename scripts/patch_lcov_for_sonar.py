#!/usr/bin/env python3
"""
Reescreve caminhos no lcov.info do Vitest para coincidirem com sonar.sources (frontend/src/...).

O Vitest grava SF:src/... (cwd = frontend). O Sonar indexa ficheiros como frontend/src/... na raiz do repo.
"""
from __future__ import annotations

import argparse
import pathlib
import re
import sys


def patch_lcov(content: str) -> str:
    return re.sub(
        r"^SF:src(/|\\)",
        r"SF:frontend/src/",
        content,
        flags=re.MULTILINE,
    )


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "lcov_path",
        type=pathlib.Path,
        help="Caminho para lcov.info (ex.: frontend/coverage/lcov.info)",
    )
    args = p.parse_args()
    path: pathlib.Path = args.lcov_path
    if not path.is_file():
        print(f"Ficheiro inexistente: {path}", file=sys.stderr)
        return 1
    original = path.read_text(encoding="utf-8", newline="")
    patched = patch_lcov(original).replace("\\", "/")
    path.write_text(patched, encoding="utf-8", newline="")
    if patched == original:
        print(f"Aviso: nenhuma linha SF:src/ alterada em {path}", file=sys.stderr)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
