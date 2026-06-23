# ADR 0009 — Organização em monorepo

- **Status:** Aceito
- **Data:** 2025
- **Relacionado:** `README.md`, `docs/visao-geral/estrutura-codigo.md`

## Contexto

O projeto reúne backend (Django/DRF), frontend (React/TS), documentação e infraestrutura. É
preciso decidir entre repositórios separados ou um único repositório.

## Decisão

Adotar um **monorepo** com separação por diretórios de topo:

- `backend/` — API, apps de domínio, testes.
- `frontend/` — SPA React, módulos, testes.
- `docs/` — documentação funcional, técnica, de portfólio e ADRs.
- `infra/docker/` — Dockerfiles e Compose (dev, prod, monitoramento).
- `scripts/` — automação e apoio.

Ambiente de desenvolvimento orquestrado por **Docker Compose**
(`infra/docker/docker-compose.yml`).

## Alternativas consideradas

- **Polirepo (backend e frontend separados)** — descartado para o MVP: dificulta versionamento
  conjunto de mudanças que cruzam contrato de API, CI e documentação.

## Consequências

- Mudanças que cruzam backend/frontend ficam num único PR, com histórico coeso.
- CI/CD e documentação centralizados.
- Onboarding mais simples (um clone, um Compose).
- Ponto de atenção: Repositório maior; pipelines precisam de filtros por área quando convém.


