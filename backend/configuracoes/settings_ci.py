"""
Definições para testes automatizados e Sonar (SQLite em memória).

Carrega o settings principal após preencher variáveis mínimas de ambiente.
"""
import os

os.environ.setdefault(
    "DJANGO_SECRET_KEY",
    "ci-test-django-secret-key-not-for-production-use-xxxxxxxx",
)
os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")
os.environ.setdefault("DB_NAME", "unused")
os.environ.setdefault("DB_USER", "unused")
os.environ.setdefault("DB_PASSWORD", "unused")
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

from configuracoes.settings import *  # noqa: E402, F403

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
