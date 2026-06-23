# ADR 0001 — Stack tecnológica

- **Status:** Aceito
- **Data:** 2025
- **Relacionado:** RFC §3.2.6, §3.3

## Contexto

O produto é uma aplicação web CPQ/PCS para configuração e orçamentação de painéis elétricos.
É necessário um backend com forte modelagem de domínio (catálogo, regras, propostas) e um
frontend de interface guiada (wizard). A equipe precisa de produtividade, ecossistema maduro e
boa documentação, dentro de um contexto acadêmico/MVP.

## Decisão

- **Backend:** Python com **Django + Django REST Framework (DRF)**.
- **Frontend:** **React + TypeScript + Vite**, com React Router e React Query.
- **Banco de dados:** **PostgreSQL** (persistência transacional e relacional).

## Alternativas consideradas

- **Backend Node/Express ou FastAPI** — descartado por menor produtividade na modelagem de
  domínio relacional e admin out-of-the-box do Django.
- **MySQL / SQLite** — descartados. SQLite é inadequado para produção (e é explicitamente
  vedado pela linha de projeto do portfólio); PostgreSQL oferece recursos avançados e
  confiabilidade.

## Consequências

- ✅ Aderência total à stack proposta no RFC.
- ✅ ORM, migrações e admin do Django aceleram o desenvolvimento do catálogo e das regras.
- ✅ Tipagem do TypeScript reduz erros no frontend.
- ⚠️ Dois runtimes (Python + Node) exigem orquestração — mitigada via Docker Compose
  (ver [ADR 0009](0009-monorepo.md)).
