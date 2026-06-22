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

## Custo de referência e composição do preço

O catálogo **não armazena preço de venda**. Cada `Produto`/`Servico` guarda apenas o
**`custo_referencia`** (campo `DecimalField`), que representa o custo de aquisição/insumo
do item — tipicamente o **valor unitário da última NF-e de entrada** (`vUnCom`), mas
editável manualmente.

> Histórico: o campo se chamava `preco_base` (e `preco_atualizado_em`). Foi renomeado para
> `custo_referencia` / `custo_atualizado_em` (migração `catalogo.0017`) porque, na prática,
> sempre funcionou como **custo**, não como preço de lista. A renomeação alinhou o nome ao
> significado real e evita a confusão de "o XML sobrescreve o preço de venda".

**Como o preço da oferta é composto** (em `apps.orcamentos`, não no catálogo):

```
preço unitário da linha = custo_referencia × (1 + margem) × (1 + IPI)
```

- **`custo_referencia`** (catálogo): base de custo do item. Atualizado:
  - automaticamente na **importação de NF-e** (`nfe_catalogo_apply` grava `vUnCom`);
  - manualmente no cadastro do produto/serviço;
  - pela **revisão de preço na oferta** (`revisar_preco_catalogo`), que também atualiza o catálogo.
- **margem**: definida **por cliente** (`/erp/orcamentos/margens-clientes`), aplicada na linha do orçamento.
- **IPI**: alíquota de referência do cadastro fiscal do produto (somente leitura na linha).

Campos de apoio:

- **`custo_atualizado_em`**: data da última atualização do `custo_referencia` (preenchida no `save()` quando o valor muda). Usada por `politica_preco_catalogo` para sinalizar custo desatualizado nas ofertas (alerta "Preço vencido").
- A linha de orçamento (`OrcamentoItem`) materializa `custo_unitario` (cópia do `custo_referencia` no momento) e `preco_unitario` (já com margem + IPI), preservando rastreabilidade mesmo que o catálogo mude depois.

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
