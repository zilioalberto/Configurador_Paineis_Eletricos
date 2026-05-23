# Arquitetura

Visão de alto nível do monorepo **Configurador de Painéis Elétricos**.

> **Portfólio ([RFC](../rfc.pdf)):** MVP = **CPQ** (catálogo + wizard + regras + BoM) em `configurador_paineis` e `catalogo`. O ERP no diagrama é evolução do monorepo, fora do § 2.7 do RFC. Ver [escopo-portfolio.md](escopo-portfolio.md).

O repositório evolui como ERP modular; o núcleo do portfólio é engenharia de painéis (projetos → cargas → dimensionamento → composição).

## Diagrama

```mermaid
flowchart TB
  subgraph client [Cliente]
    Browser[Navegador]
  end

  subgraph frontend [frontend/]
    UI[React + Vite + TypeScript]
    Modules[src/modules/*]
    UI --> Modules
  end

  subgraph backend [backend/]
    API[Django REST Framework]
    Apps[apps/* + core/]
    API --> Apps
  end

  subgraph data [Dados]
    PG[(PostgreSQL)]
  end

  subgraph infra [infra/]
    Docker[Docker Compose]
    Mon[Prometheus / Grafana]
  end

  Browser --> UI
  Modules -->|HTTP / JWT| API
  Apps --> PG
  Docker --> frontend
  Docker --> backend
  Docker --> PG
  Mon --> API
```

## Estrutura de pastas

| Pasta | Função |
|-------|--------|
| `backend/` | API Django, regras de negócio, migrações, testes pytest |
| `backend/apps/` | Módulos de domínio (`catalogo`, `configurador_paineis`, `tarefas`, …) |
| `backend/core/` | Utilitários compartilhados (cálculos, permissões, modelos base) |
| `backend/config/` | Settings, URLs, registro de módulos ERP (`erp_registry.py`) |
| `frontend/` | SPA React; módulos espelham domínios em `src/modules/` |
| `infra/docker/` | Compose de dev, produção e monitoramento |
| `infra/monitoring/` | Prometheus, Grafana, regras de alerta |
| `docs/` | Documentação do projeto |
| `scripts/` | Utilitários de CI e manutenção |

## Fluxo principal do configurador

```mermaid
flowchart LR
  P[Projeto] --> C[Cargas]
  C --> D[Dimensionamento]
  D --> CP[Composição do painel]
  CAT[Catálogo técnico] -.-> D
  CAT -.-> CP
```

1. **Projeto** — identificação, cliente, recursos e contexto do painel.
2. **Cargas** — motores, resistências, alimentação geral e demais circuitos.
3. **Dimensionamento** — cálculos normativos, escolha de proteções e condutores.
4. **Composição** — lista técnica de materiais (sugestões automáticas e inclusão manual).

O **catálogo** alimenta seleção de componentes e dados fiscais/técnicos.

## API e metadados de módulos

- Rotas REST sob prefixos por app (ex.: configurador, catálogo, tarefas).
- Metadados descritivos dos módulos do roadmap: `backend/config/erp_registry.py`.
- Endpoint de meta por módulo: `GET .../erp/modules/<slug>/meta/` (consumido pelo frontend).

## Autenticação

- JWT (login/refresh) via DRF.
- Frontend: `src/modules/auth/` — contexto, guards de rota e permissões.

## Observabilidade

- `django-prometheus` no backend.
- Stack opcional: `infra/docker/docker-compose.monitoring.yml` (ver [monitoramento](../infra/monitoramento.md)).

## Próximos passos na documentação

- Detalhar contratos de API por módulo (OpenAPI ou tabelas de endpoints).
- Diagrama de deploy em produção (`docker-compose.prod.yml`).
