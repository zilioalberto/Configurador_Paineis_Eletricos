# ADR 0008 — Observabilidade com Prometheus + Grafana + Alertmanager

- **Status:** Aceito
- **Data:** 2025–2026
- **Relacionado:** RFC §3.2.1, §3.3.2, RNF-13; linha Web Apps (observabilidade obrigatória)

## Contexto

A linha de projeto Web Apps exige **ferramenta de monitoramento/observabilidade**, e o RFC
previu logs estruturados, métricas básicas (latência p50/p95) e healthcheck. É necessário
evidenciar métricas operacionais (incluindo o p95 ≤ 500 ms das métricas de sucesso do RFC).

## Decisão

Stack de observabilidade baseada em **Prometheus + Grafana + Alertmanager**, com exporters:

- `django-prometheus` expõe métricas da aplicação (latência, contadores HTTP).
- **Prometheus** coleta as métricas; **Grafana** provê dashboards; **Alertmanager** gerencia
  alertas.
- `postgres_exporter` e `blackbox_exporter` cobrem banco e disponibilidade de endpoints.
- Endpoint **`/api/v1/health/`** para healthcheck.
- Compose dedicado: `infra/docker/docker-compose.monitoring.yml`.

## Alternativas consideradas

- **SaaS (NewRelic/Datadog/Sentry)** — viáveis pela linha de projeto, mas Prometheus/Grafana são
  open-source, self-hosted e já previstos no RFC; evita custo e lock-in.

## Consequências

- Atende ao requisito obrigatório de observabilidade.
- Permite evidenciar o p95 das operações do wizard (métrica de sucesso do RFC).
- Alertas configuráveis para disponibilidade.
- Ponto de atenção: Mais containers para operar — isolados em um Compose próprio de monitoramento.


