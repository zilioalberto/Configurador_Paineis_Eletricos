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

## A documentar

- [ ] Ciclo de vida do orçamento (rascunho → aprovado)
- [ ] Vínculo com configurador / composição
- [ ] Cálculo de margens e IPI

## Testes

```bash
pytest backend/apps/orcamentos -q
```
