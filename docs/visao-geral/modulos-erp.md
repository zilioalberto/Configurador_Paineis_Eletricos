# Módulos do ERP

Mapa dos módulos do **monorepo** (roadmap ERP). Os metadados canônicos estão em `backend/config/erp_registry.py`.

> **Portfólio ([RFC](../rfc.pdf)):** MVP = configurador (wizard/BoM) + catálogo + auth. Demais módulos = evolução ERP (**§ 2.7** sem integração ERP/CRM). Ver [escopo-portfolio.md](escopo-portfolio.md) e [rastreabilidade](../portfolio/rastreabilidade-requisitos.md).

**Legenda de status**

| Status | Significado |
|--------|-------------|
| **Implementado** | Models, API e telas em uso |
| **Parcial** | Funcionalidade inicial; expandir models/fluxos |
| **Stub** | App registrado; implementação futura |
| **Planejado** | Previsto no roadmap; sem app ou só estrutura mínima |

**Legenda — Portfólio (RFC)**

| Portfólio | Significado |
|-----------|-------------|
| **Sim** | Entregável / suporte direto ao wizard de configuração de painéis |
| **Não** | Fora do escopo acadêmico; evolução ERP |

> Atualize *Status* conforme o código evoluir. *Doc* aponta para `docs/modulos/`.

## Engenharia

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `configurador-paineis` | Configurador de painéis | Implementado | **Sim** | `apps.configurador_paineis` | [README](../modulos/configurador-paineis/README.md) |

## Base compartilhada

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `catalogo` | Catálogo técnico | Implementado | **Sim** (suporte) | `apps.catalogo` | [catalogo.md](../modulos/catalogo.md) |

## Fundação

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `cadastros` | Cadastros | Parcial | Não | `apps.cadastros` | [cadastros.md](../modulos/cadastros.md) |
| `rh` | RH | Stub | Não | `apps.rh` | [rh.md](../modulos/rh.md) |

## Comercial

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `crm` | CRM | Stub | Não | `apps.crm` | [crm.md](../modulos/crm.md) |
| `orcamentos` | Orçamentos | Parcial | Parcial (RF-09) | `apps.orcamentos` | [orcamentos.md](../modulos/orcamentos.md) |
| `pedidos-venda` | Pedidos de venda | Stub | Não | `apps.pedidos_venda` | [pedidos-venda.md](../modulos/pedidos-venda.md) |

## Execução

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `producao` | Produção | Stub | Não | `apps.producao` | [producao.md](../modulos/producao.md) |
| `tarefas` | Tarefas | Implementado | Não | `apps.tarefas` | [tarefas.md](../modulos/tarefas.md) |

## Suprimentos

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `compras` | Compras | Stub | Não | `apps.compras` | [compras.md](../modulos/compras.md) |
| `estoque` | Estoque | Stub | Não | `apps.estoque` | [estoque.md](../modulos/estoque.md) |
| `fiscal` | Fiscal | Parcial | Não | `apps.fiscal` | [fiscal.md](../modulos/fiscal.md) |

## Controle

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `financeiro` | Financeiro | Stub | Não | `apps.financeiro` | [financeiro.md](../modulos/financeiro.md) |
| `qualidade` | Qualidade | Stub | Não | `apps.qualidade` | [qualidade.md](../modulos/qualidade.md) |
| `conformidade` | Conformidade | Stub | Não | `apps.conformidade` | [conformidade.md](../modulos/conformidade.md) |

## Pós-venda

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `expedicao` | Expedição | Stub | Não | `apps.expedicao` | [expedicao.md](../modulos/expedicao.md) |
| `pos-venda` | Pós-venda | Stub | Não | `apps.pos_venda` | [pos-venda.md](../modulos/pos-venda.md) |

## Transversal

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `documentos` | Documentos | Parcial | Não | `apps.documentos` | [documentos.md](../modulos/documentos.md) |
| `notificacoes` | Notificações | Stub | Não | `apps.notificacoes` | [notificacoes.md](../modulos/notificacoes.md) |
| `auditoria` | Auditoria | Stub | Não | `apps.auditoria` | [auditoria.md](../modulos/auditoria.md) |
| `integracoes` | Integrações | Stub | Não | `apps.integracoes` | [integracoes.md](../modulos/integracoes.md) |
| — | Autenticação / contas | Implementado | **Sim** (infra) | `apps.accounts` | [auth.md](../modulos/auth.md) |

## Indicadores

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `relatorios` | Relatórios | Stub | Não | `apps.relatorios` | [relatorios.md](../modulos/relatorios.md) |

## Administração

| ID | Título | Status | Portfólio | Backend | Doc |
|----|--------|--------|-----------|---------|-----|
| `configuracoes-erp` | Configurações do ERP | Parcial | Não | `apps.configuracoes_erp` | [configuracoes-erp.md](../modulos/configuracoes-erp.md) |

## Sub-apps do configurador (portfólio)

| Sub-app | Pacote | Portfólio | Doc |
|---------|--------|----------|-----|
| Projetos | `...projetos` | Sim | [projetos.md](../modulos/configurador-paineis/projetos.md) |
| Cargas | `...cargas` | Sim | [cargas.md](../modulos/configurador-paineis/cargas.md) |
| Dimensionamento | `...dimensionamento` | Sim | [dimensionamento.md](../modulos/configurador-paineis/dimensionamento.md) |
| Composição | `...composicao_painel` | Sim | [composicao.md](../modulos/configurador-paineis/composicao.md) |
| Wizard (fluxo integrado) | UI `ProjetoWizardPage` + APIs das etapas | **Sim (núcleo)** | [README configurador](../modulos/configurador-paineis/README.md) |
| Seleção de componentes | `...selecao_componentes` | Sim (suporte) | README do configurador |
