# Docker

Arquivos de containerização em `infra/docker/`.

## Compose de desenvolvimento

**Arquivo:** `infra/docker/docker-compose.yml`

| Serviço | Imagem / build | Porta |
|---------|----------------|-------|
| `db` | PostgreSQL 16 | `DB_EXTERNAL_PORT` → 5432 (padrão 15432) |
| `backend` | `Dockerfile.backend` | 8000 |
| `frontend` | `Dockerfile.frontend` | 5173 |

Contextos de build:

- Backend: `backend/` (dockerfile em `infra/docker/`)
- Frontend: `frontend/`

Volumes:

- Código montado em `/app` (hot reload)
- `node_modules` anônimo no frontend para não sobrescrever dependências

**Comando na raiz:**

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

Variáveis: `.env` na raiz (ver [setup-local](../desenvolvimento/setup-local.md)).

## Produção

**Arquivo:** `infra/docker/docker-compose.prod.yml`

<!-- Documentar: diferenças de comando, gunicorn/uvicorn, nginx, variáveis obrigatórias -->

## Entrypoint do backend

`backend/entrypoint.backend.sh`:

1. Aguarda PostgreSQL
2. `python manage.py migrate`
3. `runserver 0.0.0.0:8000` (dev)

## A documentar

- [ ] Topologia de rede entre serviços
- [ ] Backup e restore do volume `postgres_data`
- [ ] Deploy em servidor (referência `Nginx.txt` na raiz, se aplicável)
