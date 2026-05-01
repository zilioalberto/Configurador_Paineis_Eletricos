import json
import os
import sys
from collections import OrderedDict

ROOT = os.path.dirname(os.path.dirname(__file__))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "configuracoes.settings")

import django
from django.db import models

django.setup()

from catalogo.api.serializers import CATEGORIA_PARA_CAMPO, MODEL_BY_CAMPO
from core.choices.produtos import CategoriaProdutoNomeChoices
from core.choices import eletrica, paineis, produtos


FRONTEND_DATA_DIR = os.path.join(
    os.path.dirname(ROOT),
    "frontend",
    "src",
    "modules",
    "catalogo",
    "data",
)


def _choice_options(choices):
    out = []
    for value, label in choices:
        out.append({"value": value, "label": str(label)})
    return out


def build_choice_class_options():
    modules = [produtos, eletrica, paineis]
    out = OrderedDict()
    for module in modules:
        for name in sorted(dir(module)):
            obj = getattr(module, name)
            if (
                isinstance(obj, type)
                and issubclass(obj, models.TextChoices)
                and obj is not models.TextChoices
            ):
                out[name] = _choice_options(obj.choices)
    return out


def build_spec_field_list():
    out = OrderedDict()
    for categoria, _label in CategoriaProdutoNomeChoices.choices:
        campo = CATEGORIA_PARA_CAMPO.get(categoria)
        if not campo:
            continue
        model = MODEL_BY_CAMPO[campo]
        fields = []
        for f in model._meta.concrete_fields:
            if f.name in {"id", "produto", "criado_em", "atualizado_em"}:
                continue
            fields.append({"name": f.name, "django": f.__class__.__name__})
        out[categoria] = fields
    return out


def build_categoria_field_choice_options():
    out = OrderedDict()
    for categoria, _label in CategoriaProdutoNomeChoices.choices:
        campo = CATEGORIA_PARA_CAMPO.get(categoria)
        if not campo:
            continue
        model = MODEL_BY_CAMPO[campo]
        field_map = OrderedDict()
        for f in model._meta.concrete_fields:
            if f.name in {"id", "produto", "criado_em", "atualizado_em"}:
                continue
            if getattr(f, "choices", None):
                field_map[f.name] = _choice_options(f.choices)
        if field_map:
            out[categoria] = field_map
    return out


def write_json(filename, payload):
    path = os.path.join(FRONTEND_DATA_DIR, filename)
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(payload, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    print(f"Wrote {path}")


def main():
    write_json("choiceClassOptions.json", build_choice_class_options())
    write_json("specFieldList.json", build_spec_field_list())
    write_json("categoriaFieldChoiceOptions.json", build_categoria_field_choice_options())


if __name__ == "__main__":
    main()
