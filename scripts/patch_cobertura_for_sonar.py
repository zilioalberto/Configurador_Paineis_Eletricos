#!/usr/bin/env python3
"""
Alinha o Cobertura XML do coverage.py ao layout que o SonarCloud espera com sonar.sources=backend.

O pytest com --cov=backend grava normalmente:
  <source>.../repositório/backend</source>
  <class filename="accounts/admin.py" ...>

O Sonar indexa ficheiros como backend/accounts/admin.py na raiz do repo — sem o prefixo
`backend/` no filename, a cobertura Python aparece a 0%.

Este script:
  - define <source> para a raiz do repositório (argumento ou diretório pai de "backend");
  - prefixa cada filename com "backend/" quando ainda não tiver esse prefixo;
  - normaliza separadores para "/" no atributo filename.

É invocado pelos passos do GitHub Actions (ci.yml / sonar.yml) após o pytest gerar coverage.xml — os testes não correm a partir deste ficheiro.
"""
from __future__ import annotations

import argparse
import pathlib
import sys
import xml.etree.ElementTree as ET


def _repo_root_from_source(source_path: pathlib.Path) -> pathlib.Path | None:
    """Se source aponta para .../backend, devolve a raiz do repo."""
    resolved = source_path.resolve()
    name = resolved.name.lower()
    if name == "backend":
        return resolved.parent
    return None


def patch_cobertura_tree(root: ET.Element, repo_root: pathlib.Path) -> None:
    sources_el = root.find("sources")
    if sources_el is None:
        return
    source_els = list(sources_el.findall("source"))
    if not source_els or not (source_els[0].text or "").strip():
        return
    old_source = pathlib.Path(source_els[0].text.strip())
    inferred = _repo_root_from_source(old_source)
    if inferred is not None:
        repo_root = inferred.resolve()
    repo_posix = repo_root.as_posix()

    for s in source_els:
        s.text = repo_posix

    for el in root.iter("class"):
        fn = el.get("filename")
        if not fn:
            continue
        norm = fn.replace("\\", "/").lstrip("/")
        if norm.startswith("backend/"):
            if fn != norm:
                el.set("filename", norm)
            continue
        el.set("filename", f"backend/{norm}")


def main() -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument(
        "coverage_xml",
        type=pathlib.Path,
        help="Caminho para coverage.xml (ex.: coverage.xml na raiz do repo)",
    )
    p.add_argument(
        "--repo-root",
        type=pathlib.Path,
        default=None,
        help="Raiz do repositório (omissão: inferir a partir de <source>.../backend)",
    )
    args = p.parse_args()
    path: pathlib.Path = args.coverage_xml
    if not path.is_file():
        print(f"Ficheiro inexistente: {path}", file=sys.stderr)
        return 1

    tree = ET.parse(path)
    root = tree.getroot()
    repo_root = (args.repo_root or path.parent).resolve()
    patch_cobertura_tree(root, repo_root)
    tree.write(path, encoding="utf-8", xml_declaration=True)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
