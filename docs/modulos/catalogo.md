# Catálogo técnico

> **Portfólio ([RFC](../rfc.pdf)):** **RF-02** e **RF-10** — catálogo obrigatório do MVP; suporte direto ao wizard. Resumo: [portfolio/rfc.md](../portfolio/rfc.md).

## Objetivo

Produtos, categorias, especificações técnicas e importação de XML de NF-e de fornecedores.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Implementado** — `apps.catalogo` |
| Frontend | **Implementado** — `src/modules/catalogo` |

**ID ERP:** `catalogo` · **Área:** Base compartilhada

## Backend

- **App:** `backend/apps/catalogo/`
- **Selectors:** famílias de produtos (disjuntores, PLCs, trilhos DIN, etc.)
- **Services:** `nfe_catalogo_apply` — aplicação de dados de NF-e
- **Models:** produtos, categorias, especificações por tipo

## Frontend

- Listagem e formulário de produtos
- Importação NF-e (`NfeImportPage`) — comparação XML × catálogo, layout responsivo (`NfeImportPage.css`)
- Modelos de carga reutilizáveis (`CargaModelosPage`) — parâmetros por tipo em blocos recolhíveis no mobile
- Helpers de spec (`specFormHelpers`, `produtoPayload`)

## Integrações

- [Fiscal](fiscal.md) — tributos por produto
- [Configurador](configurador-paineis/README.md) — seleção na composição e dimensionamento

## Testes

```bash
pytest backend/apps/catalogo -q
cd frontend && npm test -- catalogo
```

## A documentar

- [ ] Modelo de categorias e chaves de especificação
- [x] Fluxo completo de importação NF-e (wizard, comparação, aplicar) — ver `NfeImportPage` e testes `NfeImportPage.test.tsx`
