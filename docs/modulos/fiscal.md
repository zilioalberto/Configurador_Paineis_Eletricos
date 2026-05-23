# Fiscal

## Objetivo

Itens fiscais por produto do catálogo e importação de tributos a partir da NF-e.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Parcial** — `apps.fiscal` |
| Frontend | **Parcial** — `src/modules/fiscal` |

**ID ERP:** `fiscal` · **Área:** Suprimentos

## Backend

- **Model:** `ItemFiscalProduto`
- Integração com importação NF-e no catálogo

## Frontend

- `FiscalHomePage`, listagem de itens fiscais

## A documentar

- [ ] Campos fiscais por produto
- [ ] Sincronização catálogo ↔ fiscal

## Testes

```bash
pytest backend/apps/fiscal -q
```
