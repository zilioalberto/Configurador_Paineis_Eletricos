# Configurador de painéis

> **Entregável do [RFC](../../rfc.pdf)** (RF-04 a RF-07): assistente **wizard** CPQ — do projeto/proposta à **BoM** com validações e sugestões. Resumo: [portfolio/rfc.md](../../portfolio/rfc.md). O monorepo ERP é evolução paralela; ver [escopo do portfólio](../../visao-geral/escopo-portfolio.md).

Módulo central de **engenharia**: do projeto elétrico à lista técnica de materiais (BoM) do painel.

## Wizard — RFC vs. implementação

| RFC (RF-04) — fluxo conceitual | Implementação atual (`ProjetoWizardPage`) |
|--------------------------------|-------------------------------------------|
| Alimentação | Projeto + cargas (alimentação geral e circuitos) |
| Proteção | Dimensionamento (proteções, correntes) |
| Comandos | Dimensionamento / seleção de comando |
| Invólucro | Composição (estrutura, invólucro quando modelado) |
| Acessórios | Composição (itens manuais e sugestões) |

Rotas típicas: `/projetos/:id/fluxo/cargas`, `.../dimensionamento`, `.../composicao`.

## Objetivo

Permitir que o engenheiro cadastre um **projeto**, defina **cargas**, execute o **dimensionamento** normativo e monte a **composição** do painel com base no catálogo técnico.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Implementado** (sub-apps ativos) |
| Frontend | **Implementado** (`configurador_paineis`) |

**ID ERP:** `configurador-paineis`  
**Pacote:** `apps.configurador_paineis`

## Sub-domínios

| Sub-app (backend) | Documento |
|-------------------|-----------|
| `projetos` | [projetos.md](projetos.md) |
| `cargas` | [cargas.md](cargas.md) |
| `dimensionamento` | [dimensionamento.md](dimensionamento.md) |
| `composicao_painel` | [composicao.md](composicao.md) |
| Wizard (fluxo integrado) | `ProjetoWizardPage` + etapas | **Núcleo do portfólio** |
| `selecao_componentes` | A documentar (seleção auxiliar) | Suporte ao wizard |
| `wizard` (pacote Django) | App registrado; lógica no fluxo integrado | Ver linha acima |

## Fluxo principal

```mermaid
flowchart LR
  P[Projeto] --> C[Cargas]
  C --> D[Dimensionamento]
  D --> CO[Composição]
```

1. Criar ou abrir um **projeto**.
2. Cadastrar **cargas** vinculadas ao projeto.
3. Executar **dimensionamento** por carga / circuito.
4. Revisar **composição** (sugestões automáticas e itens manuais).

Dependência forte do [catálogo](../catalogo.md) para produtos e especificações.

## Backend

```
backend/apps/configurador_paineis/
├── projetos/
├── cargas/
├── dimensionamento/
│   └── services/circuitos/   # regras por tipo de circuito
├── composicao_painel/
│   └── services/sugestoes/   # motor de sugestões
├── wizard/
└── selecao_componentes/
```

Cálculos compartilhados: `backend/core/calculos/`.

## Frontend

```
frontend/src/modules/configurador_paineis/
├── projetos/
├── cargas/
├── dimensionamento/
├── composicao/
└── dashboard/
```

## Testes

```bash
pytest backend/apps/configurador_paineis -q
cd frontend && npm test -- configurador_paineis
```

## A documentar

- [ ] Matriz carga → serviços de dimensionamento
- [ ] Regras do orquestrador de composição e pendências
- [ ] Wizard e seleção de componentes (telas e APIs)
