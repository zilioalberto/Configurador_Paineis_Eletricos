# Arquitetura

Visão de alto nível do monorepo **Configurador de Painéis Elétricos**.

> **Mapa de pastas e APIs:** [estrutura-codigo.md](estrutura-codigo.md). **Status dos módulos:** [modulos-erp.md](modulos-erp.md).

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

## Casos de uso (atores × funcionalidades)

Visão de alto nível dos principais atores e do que cada um faz no sistema. `SEFAZ` e
`Telegram` são sistemas externos; `Cliente` interage apenas pela oferta pública.

```mermaid
flowchart LR
  Eng([Engenharia])
  Orc([Orçamentista])
  Alm([Almoxarifado])
  Adm([Administrador])
  Cli([Cliente])
  SEFAZ[[SEFAZ]]
  TG[[Telegram]]

  subgraph CPQ [Configurador / CPQ]
    UC1(Configurar painel: projeto → cargas → dimensionamento)
    UC2(Compor BoM do painel)
  end
  subgraph COM [Comercial]
    UC3(Montar orçamento e margens)
    UC4(Gerar e enviar oferta)
    UC5(Aprovar/recusar oferta)
  end
  subgraph SUP [Suprimentos / Fiscal]
    UC6(Importar NF-e / sincronizar SEFAZ)
    UC7(Manter catálogo e custos)
  end
  subgraph ADM [Administração]
    UC8(Gerir usuários e permissões)
    UC9(Observar saúde do sistema)
  end

  Eng --> UC1 & UC2
  Orc --> UC3 & UC4 & UC7
  Alm --> UC6 & UC7
  Cli --> UC5
  Adm --> UC8 & UC9
  UC6 <--> SEFAZ
  UC9 --> TG
```

## Modelo de dados (núcleo)

Recorte das entidades centrais do portfólio (catálogo + CPQ + comercial + fiscal). Não é o
esquema completo do banco — apps de apoio (auth, tarefas, documentos, notificações, etc.) ficam
de fora. Fonte da verdade: os `models.py` de cada app.

```mermaid
erDiagram
  PARCEIRO_COMERCIAL ||--o{ ORCAMENTO : "cliente"
  PARCEIRO_COMERCIAL ||--o| CONFIG_MARGEM_CLIENTE : "margem"
  PARCEIRO_COMERCIAL ||--o{ PRODUTO : "fornece/fabrica"
  PRODUTO ||--o| ITEM_FISCAL_PRODUTO : "tributos ref."
  PROJETO_CONFIGURADOR ||--o{ CARGA : "tem"
  PROJETO_CONFIGURADOR ||--o{ DIMENSIONAMENTO_CIRCUITO : "calcula"
  PROJETO_CONFIGURADOR ||--o{ COMPOSICAO_ITEM : "BoM"
  PRODUTO ||--o{ COMPOSICAO_ITEM : "compõe"
  ORCAMENTO ||--o{ ORCAMENTO_ITEM : "linhas"
  PRODUTO ||--o{ ORCAMENTO_ITEM : "referencia"
  SERVICO ||--o{ ORCAMENTO_ITEM : "referencia"
  ORCAMENTO ||--o{ ORCAMENTO_CONFIGURADOR_PAINEL : "vincula"
  PROJETO_CONFIGURADOR ||--o{ ORCAMENTO_CONFIGURADOR_PAINEL : "origem"
  DOCUMENTO_FISCAL_RECEBIDO ||--o{ ITEM_DOCUMENTO_FISCAL : "itens"
  PRODUTO ||--o{ ITEM_DOCUMENTO_FISCAL : "importado_para_produto"

  PRODUTO {
    string codigo
    string descricao
    decimal custo_referencia
  }
  ORCAMENTO_ITEM {
    string tipo
    decimal custo_unitario
    decimal preco_unitario
  }
  ORCAMENTO {
    string codigo_base
    int revisao
    string status
  }
```

> **Composição do preço da oferta:** `preco_unitario = custo_referencia × (1 + margem do cliente) × (1 + IPI)`.
> Ver [Catálogo › Custo de referência](../modulos/catalogo.md#custo-de-referência-e-composição-do-preço).

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
- Expandir o modelo de dados para apps de apoio (tarefas, documentos, notificações, RH).
