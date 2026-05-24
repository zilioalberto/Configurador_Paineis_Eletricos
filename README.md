# Configurador de Painéis Elétricos

Sistema web para apoiar a elaboração de orçamentos técnicos de painéis elétricos. O projeto reúne um backend em **Django + Django REST Framework**, um frontend em **React + TypeScript + Vite** e uma documentação organizada por escopo, arquitetura, desenvolvimento, infraestrutura e módulos de negócio.

O foco do portfólio acadêmico é o fluxo CPQ do **Configurador de Painéis**: cadastro do projeto, levantamento de cargas, dimensionamento, composição de materiais, validações técnicas e geração da BoM para apoiar a proposta comercial. O monorepo também contém módulos de evolução ERP, mantidos para demonstrar a arquitetura completa do produto, mas eles não fazem parte do MVP formal do RFC.

## Escopo do portfólio

O entregável principal está no módulo `configurador_paineis`, com apoio direto do catálogo de materiais. Ele implementa o caminho crítico descrito no RFC: transformar dados técnicos de entrada em uma composição rastreável de materiais e regras de validação.

Documentos recomendados para entender o recorte:

- [RFC completo](docs/rfc.pdf)
- [Resumo do RFC](docs/portfolio/rfc.md)
- [Escopo do portfólio](docs/visao-geral/escopo-portfolio.md)
- [Rastreabilidade de requisitos](docs/portfolio/rastreabilidade-requisitos.md)
- [Configurador de painéis](docs/modulos/configurador-paineis/README.md)

## Visão técnica

O projeto é organizado como um monorepo com separação clara entre aplicação, documentação e infraestrutura:

| Caminho | Finalidade |
|---------|------------|
| `backend/` | API Django, apps de domínio, autenticação, persistência e testes de backend |
| `frontend/` | SPA React com módulos de negócio, rotas, serviços HTTP e testes de frontend |
| `docs/` | Documentação funcional, técnica, de portfólio, infraestrutura e módulos |
| `infra/docker/` | Dockerfiles e arquivos Compose para desenvolvimento, produção e monitoramento |
| `scripts/` | Scripts auxiliares de validação, automação e apoio ao desenvolvimento |

Para uma explicação mais detalhada das camadas, integrações e responsabilidades, consulte [Arquitetura](docs/visao-geral/arquitetura.md).

## Mapa estrutural do código

Referência rápida para navegar no repositório. O guia completo está em **[Estrutura do código](docs/visao-geral/estrutura-codigo.md)**.

### Monorepo

| Pasta | Conteúdo |
|-------|----------|
| `backend/apps/` | Domínios Django (models, API, services, testes) |
| `backend/config/` | URLs, settings, JWT, `erp_registry.py` |
| `backend/core/` | Choices, cálculos elétricos, permissões compartilhadas |
| `frontend/src/modules/` | Um diretório por área de negócio (espelha o backend) |
| `frontend/src/app/` | Router, agregação de menus (`collectNavigation.ts`) |
| `docs/modulos/` | Documentação funcional por módulo |

### Módulos operacionais (API + UI)

| Área | Backend | Frontend | Rotas UI (exemplos) |
|------|---------|----------|---------------------|
| Auth | `accounts`, `config` | `auth`, `usuarios` | `/login`, `/administracao/utilizadores` |
| Launcher | `config.erp_registry` | `modulos` | `/` |
| Configurador | `configurador_paineis/*` | `configurador_paineis/` | `/dashboard`, `/projetos`, `/cargas`, … |
| Catálogo | `catalogo` | `catalogo` | `/catalogo` |
| Fiscal | `fiscal` | `fiscal` | `/fiscal` |
| Tarefas | `tarefas` | `tarefas` | `/tarefas` |
| ERP comercial | `orcamentos`, `configuracoes_erp` | `erp/` | `/erp/orcamentos`, `/erp/configuracoes` |
| Cadastros / RH | `cadastros`, `rh` | `cadastros`, `rh` (via `/erp/`) | `/erp/cadastros`, `/erp/rh` |

API REST unificada em **`/api/v1/`** (JWT). Orçamentos e parâmetros ERP ficam em **`/api/v1/erp/`**.

### Padrões recorrentes

- **Registry:** cada módulo frontend exporta `*.registry.ts(x)` com rotas e menu; `collectNavigation.ts` agrega tudo.
- **Permissões:** backend `HasEffectivePermission` + frontend `RequirePermission` / `PERMISSION_KEYS`.
- **HTTP:** `frontend/src/services/apiClient.ts` (Bearer + refresh automático).
- **Testes:** `backend/apps/<app>/tests/` e `frontend/src/modules/<modulo>/**/*.test.*`.

Apps Django registrados apenas como **stub de roadmap** (sem API ativa): `crm`, `compras`, `estoque`, `producao`, `financeiro`, `qualidade`, `conformidade`, `expedicao`, `pos_venda`, `documentos`, `notificacoes`, `auditoria`, `integracoes`, `relatorios`, `pedidos_venda`. Detalhes em [Módulos do ERP](docs/visao-geral/modulos-erp.md).

## Execução local

O caminho recomendado para rodar o ambiente completo é o Docker Compose, pois ele sobe PostgreSQL, backend e frontend com a mesma topologia usada pela documentação do projeto.

1. Copie o arquivo de exemplo:

```bash
cp .env.example .env
```

2. Preencha no `.env` os valores obrigatórios, especialmente `DB_PASSWORD` e `DJANGO_SECRET_KEY`.

3. Suba os serviços a partir da raiz do repositório:

```bash
docker compose -f infra/docker/docker-compose.yml up --build
```

Serviços principais:

| Serviço | URL / porta |
|---------|-------------|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:8000 |
| PostgreSQL | `localhost:15432` |

O guia completo de ambiente, incluindo execução sem Docker e solução de problemas comuns, está em [Setup local](docs/desenvolvimento/setup-local.md).

## Desenvolvimento

O backend usa Django, Django REST Framework, PostgreSQL e testes com Pytest. A documentação específica descreve apps, configurações, comandos de migração, padrões de API e execução da suíte de testes.

O frontend usa React, TypeScript, Vite, React Router, React Query e Vitest. A documentação específica detalha a organização por módulos, serviços de API, variáveis de ambiente e comandos de build.

Guias principais:

- [Backend](docs/desenvolvimento/backend.md)
- [Frontend](docs/desenvolvimento/frontend.md)
- [Contribuição](docs/desenvolvimento/contribuicao.md)
- [Checklist de testes](docs/checklist-testes.md)

Comandos rápidos:

```bash
# Backend
set PYTHONPATH=backend
set DJANGO_SETTINGS_MODULE=config.settings_ci
pytest backend -q

# Frontend
cd frontend
npm install
npm run dev
npm test
npm run build
```

## Documentação

O índice central da documentação está em [docs/README.md](docs/README.md). Ele é o melhor ponto de partida para navegar entre documentação de produto, arquitetura, desenvolvimento, infraestrutura, módulos e materiais de apresentação.

Atalhos úteis:

- [Estrutura do código](docs/visao-geral/estrutura-codigo.md)
- [Arquitetura](docs/visao-geral/arquitetura.md)
- [Módulos do ERP](docs/visao-geral/modulos-erp.md)
- [Glossário](docs/visao-geral/glossario.md)
- [Docker](docs/infra/docker.md)
- [Monitoramento](docs/infra/monitoramento.md)
- [Roteiro de demo](docs/portfolio/roteiro-demo.md)
- [Mapa da API do wizard](docs/portfolio/mapa-api-wizard.md)

## Observação sobre o escopo

Este repositório demonstra tanto o MVP do configurador quanto uma base evolutiva para um ERP industrial. Para avaliação do portfólio, considere prioritariamente o configurador, o catálogo, os endpoints do wizard, os testes do caminho crítico e os documentos vinculados ao RFC.
