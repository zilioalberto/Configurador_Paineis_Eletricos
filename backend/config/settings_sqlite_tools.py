"""
SQLite local só para comandos de gestão (ex.: `makemigrations`) sem Postgres.
Não usar em produção nem como substituto de `settings_ci` nos testes.
"""
from __future__ import annotations

import os
import secrets

if "DJANGO_SECRET_KEY" not in os.environ:
    os.environ["DJANGO_SECRET_KEY"] = secrets.token_urlsafe(32)

os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")

import config.settings as _base  # noqa: E402

for _name in dir(_base):
    if _name.isupper():
        globals()[_name] = getattr(_base, _name)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": str(_base.BASE_DIR / "makemigrations.sqlite3"),
    }
}
