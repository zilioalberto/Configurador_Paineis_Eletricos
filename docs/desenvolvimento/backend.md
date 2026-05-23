# Backend (Django)

API e regras de negócio em `backend/`.

## Stack

- Python 3.12
- Django + Django REST Framework
- PostgreSQL (desenvolvimento e produção via Docker)
- JWT (`rest_framework_simplejwt` ou equivalente em `config/jwt_views.py`)
- Testes: **pytest** + **pytest-django** (`backend/pytest.ini`, `backend/conftest.py`)

## Layout

```
backend/
├── config/          # settings, urls, erp_registry, JWT
├── core/            # permissões, cálculos compartilhados, modelos base
├── apps/            # módulos de domínio
│   ├── accounts/
│   ├── catalogo/
│   ├── configurador_paineis/
│   │   ├── projetos/
│   │   ├── cargas/
│   │   ├── dimensionamento/
│   │   ├── composicao_painel/
│   │   ├── wizard/
│   │   └── selecao_componentes/
│   ├── tarefas/
│   └── …
├── manage.py
└── requirements.txt
```

## Apps instalados

Lista atual em `backend/config/settings.py` → `INSTALLED_APPS`. Novos módulos do roadmap devem ser registrados ali e, quando aplicável, em `erp_registry.py`.

## Comandos úteis

Dentro do container `backend` ou com venv local e `DJANGO_SETTINGS_MODULE=config.settings`:

```bash
python manage.py migrate
python manage.py makemigrations <app>
python manage.py createsuperuser
python manage.py shell
```

## Testes e cobertura

Na **raiz** do repositório (igual ao CI):

```bash
# Linux / macOS
export PYTHONPATH=backend
export DJANGO_SETTINGS_MODULE=config.settings_ci
pytest backend -q --tb=short

# Com cobertura (raiz, .coveragerc)
pytest backend --cov=backend --cov-config=.coveragerc --cov-report=term
```

Settings de CI: `config/settings_ci.py` (SQLite ou configuração isolada para pipelines).

## Convenções por app

Estrutura típica de um app Django neste projeto:

| Pasta | Uso |
|-------|-----|
| `models/` | Modelos de domínio |
| `api/` | ViewSets, serializers, urls |
| `services/` | Regras de negócio e orquestração |
| `selectors/` | Consultas de leitura (quando usado, ex. catálogo) |
| `tests/` | Testes pytest |

## Documentação de módulos

Cada módulo de negócio: `docs/modulos/<slug>.md` ou subpasta `docs/modulos/configurador-paineis/`.

## A documentar

- [ ] Mapa de URLs (`config/urls.py`, `erp_api_urls.py`)
- [ ] Política de permissões (`core/permissions.py`)
- [ ] Migrações e seeds de dados de referência
