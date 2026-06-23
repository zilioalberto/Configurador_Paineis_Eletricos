# Documentação — Configurador de Painéis Elétricos

Índice central da documentação do monorepo. O [README na raiz](../README.md) resume o projeto e aponta para aqui.

## Portfólio (disciplina / RFC)

**RFC formal:** [rfc.pdf](rfc.pdf) — *Módulo de Auxílio à Escolha de Materiais para Orçamentos de Painéis Elétricos* (CPQ: wizard + catálogo + BoM + validações).

| Documento | Conteúdo |
|-----------|----------|
| [Resumo do RFC](portfolio/rfc.md) | MVP, RF/RNF, limitações, marcos |
| [Escopo vs. monorepo](visao-geral/escopo-portfolio.md) | O que avaliar no portfólio |
| [Rastreabilidade](portfolio/rastreabilidade-requisitos.md) | RF-01…RF-10 × código |
| [Mapa API wizard](portfolio/mapa-api-wizard.md) | Endpoints do caminho crítico |
| [Relatório de conformidade](portfolio/relatorio-conformidade.md) | Modelo RNF-15 por projeto |
| [Checklist de testes](checklist-testes.md) | Caminho crítico para demo/avaliação |
| [**Evidências de testes/cobertura**](portfolio/evidencias-testes.md) | Cobertura backend/frontend vs. metas |
| [**Decisões de arquitetura (ADRs)**](adr/README.md) | Registro de decisões técnicas |
| [**Roteiro de apresentação (M7)**](portfolio/roteiro-demo.md) | Apresentação passo a passo para avaliação |
| [Configurador / wizard](modulos/configurador-paineis/README.md) | Entregável principal no código |

## Visão geral

- [Escopo do portfólio](visao-geral/escopo-portfolio.md) — wizard (RFC) vs. evolução ERP
- [Arquitetura](visao-geral/arquitetura.md) — camadas, pastas e integração backend ↔ frontend
- [Decisões de arquitetura (ADRs)](adr/README.md) — decisões técnicas, alternativas e desvios do RFC
- [**Estrutura do código**](visao-geral/estrutura-codigo.md) — mapa de pastas, APIs, registries e correspondência frontend ↔ backend
- [Módulos do ERP](visao-geral/modulos-erp.md) — mapa do monorepo (inclui itens **fora** do portfólio)
- [Glossário](visao-geral/glossario.md) — termos do domínio

## Desenvolvimento

- [Setup local](desenvolvimento/setup-local.md) — `.env`, Docker, migrações e URLs
- [Backend](desenvolvimento/backend.md) — Django, apps, testes
- [Frontend](desenvolvimento/frontend.md) — React, módulos, testes
- [Contribuição](desenvolvimento/contribuicao.md) — branches, PR e CI

## Infraestrutura

- [Docker](infra/docker.md) — compose de desenvolvimento e produção
- [Monitoramento](infra/monitoramento.md) — Prometheus, Grafana e alertas

## Módulos de negócio

### Configurador de painéis

- [Visão geral](modulos/configurador-paineis/README.md)
- [Projetos](modulos/configurador-paineis/projetos.md)
- [Cargas](modulos/configurador-paineis/cargas.md)
- [Dimensionamento](modulos/configurador-paineis/dimensionamento.md)
- [Composição](modulos/configurador-paineis/composicao.md)

### Demais módulos

| Área | Módulo | Documento |
|------|--------|-----------|
| Base compartilhada | Catálogo | [catalogo.md](modulos/catalogo.md) |
| Fundação | Cadastros | [cadastros.md](modulos/cadastros.md) |
| Fundação | RH | [rh.md](modulos/rh.md) |
| Comercial | CRM | [crm.md](modulos/crm.md) |
| Comercial | Orçamentos | [orcamentos.md](modulos/orcamentos.md) |
| Comercial | Pedidos de venda | [pedidos-venda.md](modulos/pedidos-venda.md) |
| Execução | Produção | [producao.md](modulos/producao.md) |
| Execução | Tarefas | [tarefas.md](modulos/tarefas.md) |
| Suprimentos | Compras | [compras.md](modulos/compras.md) |
| Suprimentos | Estoque | [estoque.md](modulos/estoque.md) |
| Suprimentos | Fiscal | [fiscal.md](modulos/fiscal.md) |
| Suprimentos | Fiscal · NFS-e ADN | [fiscal-nfse-adn.md](modulos/fiscal-nfse-adn.md) |
| Controle | Fiscal · Obrigações | [fiscal-obrigacoes.md](modulos/fiscal-obrigacoes.md) |
| Controle | Financeiro | [financeiro.md](modulos/financeiro.md) |
| Controle | Qualidade | [qualidade.md](modulos/qualidade.md) |
| Controle | Conformidade | [conformidade.md](modulos/conformidade.md) |
| Pós-venda | Expedição | [expedicao.md](modulos/expedicao.md) |
| Pós-venda | Pós-venda | [pos-venda.md](modulos/pos-venda.md) |
| Transversal | Documentos | [documentos.md](modulos/documentos.md) |
| Transversal | Notificações | [notificacoes.md](modulos/notificacoes.md) |
| Transversal | Auditoria | [auditoria.md](modulos/auditoria.md) |
| Transversal | Integrações | [integracoes.md](modulos/integracoes.md) |
| Indicadores | Relatórios | [relatorios.md](modulos/relatorios.md) |
| Administração | Configurações ERP | [configuracoes-erp.md](modulos/configuracoes-erp.md) |
| Transversal | Autenticação | [auth.md](modulos/auth.md) |

## Portfólio (pasta)

- [Índice portfolio/](portfolio/README.md)

## Outros

- [Backlog de documentação e produto](backlog.md)
- [Template para novos módulos](modulos/_template.md)
