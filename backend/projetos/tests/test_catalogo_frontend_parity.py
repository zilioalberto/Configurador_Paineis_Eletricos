from __future__ import annotations

import json
import re
from pathlib import Path

from catalogo.api.serializers import CATEGORIA_PARA_CAMPO


def _repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def _frontend_catalogo_dir() -> Path:
    return _repo_root() / "frontend" / "src" / "modules" / "catalogo"


def _categorias_frontend_types() -> set[str]:
    content = (_frontend_catalogo_dir() / "types" / "categoria.ts").read_text(encoding="utf-8")
    return set(re.findall(r"\|\s*'([A-Z_]+)'", content))


def _categorias_frontend_categoria_espec_key() -> set[str]:
    content = (
        _frontend_catalogo_dir() / "constants" / "categoriaEspecKey.ts"
    ).read_text(encoding="utf-8")
    return set(re.findall(r"^\s*([A-Z_]+)\s*:", content, flags=re.MULTILINE))


def _categorias_frontend_spec_field_list() -> set[str]:
    content = json.loads(
        (_frontend_catalogo_dir() / "data" / "specFieldList.json").read_text(encoding="utf-8")
    )
    return set(content.keys())


def _categorias_frontend_choice_options() -> set[str]:
    content = json.loads(
        (_frontend_catalogo_dir() / "data" / "categoriaFieldChoiceOptions.json").read_text(
            encoding="utf-8"
        )
    )
    return set(content.keys())


def test_paridade_categorias_catalogo_backend_frontend():
    categorias_backend = set(CATEGORIA_PARA_CAMPO.keys())

    # `SEM_REGRA_SUGESTAO_AUTOMATICA` existe no frontend, mas não possui especificação técnica.
    categorias_types_front = _categorias_frontend_types() - {"SEM_REGRA_SUGESTAO_AUTOMATICA"}
    categorias_map_front = _categorias_frontend_categoria_espec_key()
    categorias_spec_front = _categorias_frontend_spec_field_list()
    categorias_choice_front = _categorias_frontend_choice_options()

    assert categorias_backend == categorias_types_front
    assert categorias_backend == categorias_map_front
    assert categorias_backend == categorias_spec_front
    assert categorias_backend == categorias_choice_front


def test_categorias_suprimidas_nao_reaparecem_no_frontend_catalogo():
    categorias_suprimidas = {"VENTILADOR", "FILTRO_AR", "RESISTENCIA_AQUECIMENTO"}

    assert categorias_suprimidas.isdisjoint(_categorias_frontend_categoria_espec_key())
    assert categorias_suprimidas.isdisjoint(_categorias_frontend_spec_field_list())
    assert categorias_suprimidas.isdisjoint(_categorias_frontend_choice_options())
