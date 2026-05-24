# Orçamentos

> **Portfólio:** apoio parcial a **RF-09** (propostas/custos); integração ERP completa **fora do RFC § 2.7**. Ver [rastreabilidade](../portfolio/rastreabilidade-requisitos.md).

## Objetivo

Propostas, versões, itens, margens, impostos e condições comerciais.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Parcial** — `apps.orcamentos` |
| Frontend | **Parcial** — `src/modules/erp` (listagem/detalhe) |

**ID ERP:** `orcamentos` · **Área:** Comercial

## Backend

- **App:** `backend/apps/orcamentos/`
- **Models:** `Orcamento`, `OrcamentoItem` (expandir versões e impostos)

## Frontend

- `OrcamentoListPage`, `OrcamentoDetailPage`
- Hooks de contatos do cliente

## Revisões e configurador

- `codigo_base` + `revisao` → exibição `Prop-MMNNN-AA Rev B`
- `POST /api/v1/erp/orcamentos/{id}/nova-revisao/` — comercial ou técnica (`paineis_reconfigurar`)
- `POST .../configuradores-painel/` — adiciona painel e cria `ProjetoConfigurador` no CPQ (cliente da proposta)
- `POST .../configuradores-painel/{vinculo_id}/sincronizar-composicao/` — importação manual da BoM

Tabela `erp_orcamento_configurador_painel` com `projeto_configurador_id` (db_column explícito).

## UI (detalhe da proposta)

- Margens de produtos/serviços no cabeçalho
- Busca de produtos do catálogo para linhas manuais
- **IPI %** exibido por linha (somente leitura; sempre do cadastro fiscal do produto)
- Painéis: adicionar, iniciar configurador (revisão técnica), sincronizar composição
- Nova revisão comercial/técnica (modal)
- **Margens por cliente:** `/erp/orcamentos/margens-clientes`

## A documentar

- [ ] Horas de dimensionamento na composição → linha de serviço na proposta (futuro)
- [x] Renomear `Projeto` → `ProjetoConfigurador` no CPQ (`configurador_projeto`)

## Testes

```bash
pytest backend/apps/orcamentos -q
```
