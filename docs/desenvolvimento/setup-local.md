# Setup local

Ambiente de desenvolvimento recomendado: **Docker Compose** na raiz do repositório, com PostgreSQL, backend Django e frontend Vite.

## Pré-requisitos

- [Docker](https://docs.docker.com/get-docker/) e Docker Compose v2
- (Opcional) Node.js 20+ e Python 3.12+ para rodar serviços fora do Docker

## 1. Variáveis de ambiente

```bash
cp .env.example .env
```

Edite `.env` na **raiz** do repositório. Obrigatório para o compose subir:

- `DB_PASSWORD` — senha do PostgreSQL
- `DJANGO_SECRET_KEY` — chave secreta do Django (trocar em qualquer ambiente real)

Para o overlay de monitoramento, veja também `GRAFANA_ADMIN_PASSWORD`, `GRAFANA_DB_PASSWORD` e `TELEGRAM_BOT_TOKEN` em `.env.example`.

> Não commite o arquivo `.env` (já está no `.gitignore`).

## 2. Subir os serviços

Na raiz do repositório:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

| Serviço | URL / porta |
|---------|-------------|
| Frontend (Vite) | http://localhost:5173 |
| Backend (Django) | http://localhost:8000 |
| PostgreSQL | `localhost:15432` (porta externa padrão; ver `DB_EXTERNAL_PORT`) |

O entrypoint do backend aguarda o banco, executa `migrate` e inicia `runserver`.

## 3. Primeiro acesso

- Admin Django: http://localhost:8000/admin/ (criar superusuário — ver [backend.md](backend.md))
- Health: endpoints em `backend/config/health_views.py`

## 4. Desenvolvimento sem Docker (opcional)

### Backend

```bash
cd backend
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -r requirements.txt
export DJANGO_SETTINGS_MODULE=config.settings
# Configure DB_* apontando para Postgres local
python manage.py migrate
python manage.py runserver
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Variáveis do Vite: `frontend/.env.development` (API base URL).

## 5. Testes rápidos

```bash
# Backend (na raiz, como no CI)
set PYTHONPATH=backend
set DJANGO_SETTINGS_MODULE=config.settings_ci
pytest backend -q

# Frontend
cd frontend
npm test
```

Detalhes: [backend.md](backend.md) e [frontend.md](frontend.md).

## 6. Monitoramento (opcional)

```bash
docker compose -f infra/docker/docker-compose.yml -f infra/docker/docker-compose.monitoring.yml up
```

Ver [monitoramento](../infra/monitoramento.md).

## Problemas comuns

| Sintoma | Possível causa |
|---------|----------------|
| Backend não sobe | `DB_PASSWORD` ausente no `.env` |
| `: not found` no entrypoint (Windows) | CRLF em scripts; o compose já normaliza via `tr -d '\r'` |
| Frontend sem API | Backend ainda iniciando ou CORS/URL da API incorreta no `.env` do frontend |
