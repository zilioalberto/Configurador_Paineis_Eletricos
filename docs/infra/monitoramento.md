# Monitoramento

Stack opcional de observabilidade para desenvolvimento e ambientes que habilitarem o overlay.

## Subir com monitoring

```bash
docker compose \
  -f infra/docker/docker-compose.yml \
  -f infra/docker/docker-compose.monitoring.yml \
  up
```

## Componentes

| Serviço | Porta padrão | Função |
|---------|--------------|--------|
| Prometheus | 9090 (`PROMETHEUS_PORT`) | Métricas e regras de alerta |
| Alertmanager | 9093 | Roteamento de alertas |
| Grafana | 3000 (`GRAFANA_PORT`) | Dashboards |
| Exporters | — | Postgres, blackbox, etc. |

Configuração:

- Prometheus: `infra/monitoring/prometheus/`
- Grafana: `infra/monitoring/grafana/` (dashboards em `grafana/dashboards/`)
- Dashboard exemplo: `configurador-painel-overview.json`

## Variáveis (.env)

Obrigatórias para o overlay (ver `.env.example`):

- `GRAFANA_ADMIN_PASSWORD`
- `GRAFANA_DB_PASSWORD`
- `TELEGRAM_BOT_TOKEN` (alertas Telegram)

## Backend

- App `django_prometheus` em `INSTALLED_APPS`
- Middleware before/after em `settings.py`

## A documentar

- [ ] Runbook de alertas (o que fazer quando X dispara)
- [ ] URLs e credenciais por ambiente (sem expor segredos no git)
