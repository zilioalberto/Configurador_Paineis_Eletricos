# Monitoramento

Stack opcional de observabilidade para desenvolvimento e ambientes que habilitarem o overlay
(`infra/docker/docker-compose.monitoring.yml` + `infra/monitoring/`).

## Subir com monitoring

```bash
docker compose \
  -f infra/docker/docker-compose.yml \
  -f infra/docker/docker-compose.monitoring.yml \
  up
```

## Componentes

| Serviço | Porta (host) | Função |
|---------|--------------|--------|
| Prometheus | `127.0.0.1:${PROMETHEUS_PORT:-9090}` | Coleta de métricas e avaliação de regras de alerta |
| Alertmanager | `127.0.0.1:${ALERTMANAGER_PORT:-9093}` | Roteamento de alertas (envia ao **Telegram**) |
| Grafana | `127.0.0.1:${GRAFANA_PORT:-3000}` | Dashboards |
| `grafana_db` | interno | PostgreSQL dedicado do Grafana (backend de configuração) |
| `postgres_exporter` | interno (9187) | Métricas do banco da aplicação (`db`) |
| `blackbox_exporter` | interno (9115) | Sondagem HTTP do health do backend |

> As portas são publicadas apenas em `127.0.0.1` (não expostas à rede). Em produção, acesse via túnel/Nginx.

## Alvos de coleta (scrape)

Definidos em `infra/monitoring/prometheus/prometheus.yml`:

| Job | Alvo | Observação |
|-----|------|------------|
| `prometheus` | `localhost:9090` | Auto-monitoramento |
| `postgres` | `postgres_exporter:9187` | Banco da aplicação |
| `django_backend` | `backend:8000/metrics` | Exposto por `django-prometheus` |
| `blackbox_backend_health` | `http://backend:8000/api/v1/health/` | Via `blackbox_exporter` (`module: http_2xx`) |

## Configuração

- Prometheus: `infra/monitoring/prometheus/prometheus.yml`
- Regras de alerta: `infra/monitoring/prometheus/rules/alerts.yml`
- Alertmanager: `infra/monitoring/alertmanager/alertmanager.yml`
- Blackbox: `infra/monitoring/blackbox/blackbox.yml`
- Grafana: `infra/monitoring/grafana/provisioning/` (datasource + dashboards) e `grafana/dashboards/`
- Dashboard exemplo: `configurador-painel-overview.json`

## Variáveis (.env)

Ver `.env.example`. Para subir o overlay completo:

| Variável | Obrigatória | Padrão | Uso |
|----------|-------------|--------|-----|
| `GRAFANA_ADMIN_PASSWORD` | **Sim** | — | Senha do admin do Grafana |
| `GRAFANA_DB_PASSWORD` | **Sim** | — | Senha do PostgreSQL do Grafana (`grafana_db`) |
| `TELEGRAM_BOT_TOKEN` | **Sim** (alertas) | — | Token do bot — Alertmanager **falha ao subir** se ausente |
| `TELEGRAM_CHAT_ID` | **Sim** (alertas) | — | Chat/grupo de destino — Alertmanager **falha ao subir** se ausente |
| `PROMETHEUS_PORT` | Não | `9090` | Porta publicada do Prometheus |
| `ALERTMANAGER_PORT` | Não | `9093` | Porta publicada do Alertmanager |
| `GRAFANA_PORT` | Não | `3000` | Porta publicada do Grafana |
| `GRAFANA_ADMIN_USER` | Não | `admin` | Usuário admin do Grafana |
| `GRAFANA_ROOT_URL` | Não | `http://localhost:3000` | URL pública do Grafana |
| `GRAFANA_DB_NAME` / `GRAFANA_DB_USER` | Não | `grafana` | Banco/usuário do `grafana_db` |
| `DB_USER` / `DB_PASSWORD` / `DB_NAME` | Sim (já do app) | — | Reaproveitadas pelo `postgres_exporter` |

> Nunca commitar segredos. Defina-os apenas no `.env` local/servidor.

## Backend (instrumentação)

- App `django_prometheus` em `INSTALLED_APPS` (`backend/config/settings.py`).
- Middlewares `PrometheusBeforeMiddleware` / `PrometheusAfterMiddleware`.
- Engine de banco instrumentada: `django_prometheus.db.backends.postgresql`.
- Métricas expostas em **`/metrics`** (via `django_prometheus.urls` em `config/urls.py`).
- Health check em **`/api/v1/health/`** (`config/health_views.py`), usado pela sonda blackbox.

## Alertas e roteamento

Regras (`prometheus/rules/alerts.yml`):

| Alerta | Condição | `for` | Severidade |
|--------|----------|-------|------------|
| `BackendHealthProbeFailed` | `probe_success{job="blackbox_backend_health"} == 0` | 2m | critical |
| `PostgresExporterDown` | `up{job="postgres"} == 0` | 2m | warning |

Roteamento (`alertmanager/alertmanager.yml`): receiver único **`telegram`**
(`group_wait` 30s, `group_interval` 5m, `repeat_interval` 4h, `send_resolved: true`).
O `docker-compose.monitoring.yml` injeta `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` em runtime.

### Runbook (resumo)

| Alerta | Provável causa | Primeira ação |
|--------|----------------|---------------|
| `BackendHealthProbeFailed` | Backend fora do ar, deploy travado, DB indisponível | Conferir `docker compose ps`, logs do `backend` e `/api/v1/health/` |
| `PostgresExporterDown` | Exporter caiu ou perdeu conexão com `db` | Conferir container `postgres_exporter` e credenciais `DB_*` |

## A documentar

- [ ] URLs e credenciais por ambiente (sem expor segredos no git)
- [ ] Painéis adicionais do Grafana além do `configurador-painel-overview`
