"""
Definições para testes automatizados e Sonar (SQLite em memória).

Carrega o settings principal após preencher variáveis mínimas de ambiente.
Não utiliza literais que imitem segredos de produção (evita falsos positivos S2068).
"""
import os
import secrets

if "DJANGO_SECRET_KEY" not in os.environ:
    os.environ["DJANGO_SECRET_KEY"] = secrets.token_urlsafe(48)

os.environ.setdefault("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,testserver")

# Variáveis só para o import de settings.py (a base de dados real dos testes é SQLite abaixo).
os.environ.setdefault("DB_NAME", "sqlite-tests")
os.environ.setdefault("DB_USER", "sqlite-tests")
if "DB_PASSWORD" not in os.environ:
    os.environ["DB_PASSWORD"] = ""
os.environ.setdefault("DB_HOST", "localhost")
os.environ.setdefault("DB_PORT", "5432")

# Importar o módulo de settings e expor apenas nomes em MAIÚSCULAS (evita import * — Sonar S2208).
import configuracoes.settings as _django_settings  # noqa: E402

for _name in dir(_django_settings):
    if _name.isupper():
        globals()[_name] = getattr(_django_settings, _name)

DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
    }
}
