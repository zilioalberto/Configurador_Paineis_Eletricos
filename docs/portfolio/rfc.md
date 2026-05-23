# RFC — Resumo para documentação do repositório

Documento formal: **[RFC completo (PDF)](../rfc.pdf)**  
*Módulo de Auxílio à Escolha de Materiais para Orçamentos de Painéis Elétricos* — Alberto Zilio, ZFW Engenharia, Joinville, 2025.

## Tema e linha de projeto

| Item | Definição (RFC) |
|------|-----------------|
| **Linha de projeto** | Web Apps |
| **Produto** | Aplicação web **CPQ/PCS** para painéis elétricos de baixa tensão |
| **Problema** | Orçamentos dependem de conhecimento tácito; erros (incompatibilidade, subdimensionamento, omissões) e ciclos longos |
| **Solução MVP** | Catálogo estruturado + **assistente passo a passo (wizard)** + regras de compatibilidade + **BoM** com estimativa de custos |

## Objetivo principal

Desenvolver aplicação web que **oriente, valide e padronize** a composição de orçamentos de painéis de BT, gerando **BoM** e estimativa de custos aderentes às normas (NR-10, ABNT NBR 5410/5419, ABNT NBR IEC 61439), com deploy público e documentação mínima.

## MVP (escopo comprometido)

Conforme resumo e seção 3.1.4 do RFC:

1. **Catálogo** de componentes (atributos técnicos e comerciais)
2. **Wizard** de configuração com validações essenciais
3. **Motor de regras** (compatibilidade elétrica/física, corrente, tensão, IP, dissipação)
4. **Sugestões** de alternativas quando houver bloqueio
5. **BoM** + custos; exportação **PDF/CSV** (metas do RFC)
6. **Autenticação** e perfis (Comercial, Engenharia, Admin)
7. **Propostas** com estados e trilha de auditoria (escopo MVP do RFC)

## Requisitos funcionais (RF)

| ID | Resumo | Ver rastreabilidade |
|----|--------|---------------------|
| RF-01 | Autenticação e perfis | [rastreabilidade-requisitos.md](rastreabilidade-requisitos.md) |
| RF-02 | Catálogo de componentes | idem |
| RF-03 | Versões de catálogo/regras (snapshot) | idem |
| RF-04 | Assistente (wizard) | idem |
| RF-05 | Validações técnico-normativas | idem |
| RF-06 | Sugestões de alternativas | idem |
| RF-07 | BoM e custos | idem |
| RF-08 | Exportações PDF/XLSX (BoM) | idem — implementado em `composicao/.../export/` |
| RF-09 | Gestão de propostas | idem |
| RF-10 | Busca e filtro no catálogo | idem |

## Requisitos não funcionais (RNF) — metas MVP

| ID | Meta (RFC) |
|----|------------|
| RNF-01 | p95 ≤ **500 ms** em buscas e validações do wizard |
| RNF-03 | Disponibilidade ≥ **99,0%** no período de avaliação |
| RNF-10 | Wizard concluível em ≤ **10** cliques/etapas (casos simples) |
| RNF-12 | Cobertura de testes ≥ **20%** (unitários + integração); CI a cada push |
| RNF-14 | Regras com referência à norma (metadado) |
| RNF-15 | Relatório de conformidade por proposta |

**Métricas de negócio (objetivos):** redução ≥ **30%** do tempo de elaboração e ≥ **50%** de erros vs. baseline ZFW; ≥ **80%** das regras essenciais do catálogo inicial.

## Wizard no RFC (RF-04)

Fluxo conceitual do documento:

**alimentação → proteção → comandos → invólucro → acessórios**

No repositório, o fluxo implementado no wizard integrado (`ProjetoWizardPage`) organiza-se como:

**projeto → cargas → dimensionamento → composição**

A correspondência entre etapas conceituais e telas está em [configurador-paineis/README.md](../modulos/configurador-paineis/README.md).

## Limitações explícitas (RFC § 2.7)

- **Sem integração direta com ERP/CRM** — apenas exportação (arquivo/API simples).
- Sem otimização multiobjetivo automática; sem simulação térmica/CAE avançada no MVP.
- Cobertura **parcial** de normas; lacunas documentadas no relatório de conformidade.

> O monorepo atual contém módulos ERP (`tarefas`, `crm`, etc.) como **evolução de produto**, não como entregáveis adicionais do RFC.

## Normas — escopo MVP

| Norma | No MVP (RFC) |
|-------|----------------|
| NR-10 | Validação automática (regras essenciais) |
| ABNT NBR 5410 | Validação automática (dimensionamento básico) |
| ABNT NBR 5419 | Documentada; sem bloqueio automático |
| ABNT NBR IEC 61439 | Documentada; verificação manual no relatório |
| LGPD | Minimização de dados, RBAC, auditoria |

## Stack (RFC § 3.2–3.3)

- **Frontend:** React (Vite), TypeScript  
- **Backend:** Django + DRF, PostgreSQL  
- **Observabilidade:** logs, healthcheck, métricas básicas (ex.: django-prometheus no repo)

## Marcos do projeto (RFC § 4.2)

| Marco | Foco |
|-------|------|
| M2 | Catálogo mínimo + regras essenciais |
| M3 | **Wizard v1** + BoM CSV |
| M4 | MVP Alpha (auth, validações, BoM) |
| M5 | PDF assíncrono + observabilidade |
| M7 | Entrega final + demo |

## Onde isso vive no código

| Entregável RFC | Pacote / pasta principal |
|----------------|--------------------------|
| Wizard + regras + BoM | `backend/apps/configurador_paineis/` |
| UI do wizard | `frontend/.../ProjetoWizardPage`, `configurador_paineis/` |
| Catálogo | `apps.catalogo` |
| Auth | `apps.accounts`, `frontend/src/modules/auth` |
| Propostas (parcial) | `apps.orcamentos`, telas em `modules/erp` |

Detalhamento: [rastreabilidade-requisitos.md](rastreabilidade-requisitos.md).
