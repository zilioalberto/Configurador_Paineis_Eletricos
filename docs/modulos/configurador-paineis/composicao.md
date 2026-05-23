# Composição do painel

Lista técnica de materiais do painel (**BoM** — RFC RF-07): **sugestões automáticas** (RF-06) a partir do dimensionamento e **inclusão manual** via catálogo.

## Objetivo

Consolidar os itens do painel (quantidades, referências de produto) para orçamento, compras e documentação de engenharia.

## Status

| Camada | Status |
|--------|--------|
| Backend | Implementado — `apps.configurador_paineis.composicao_painel` |
| Frontend | Implementado — `configurador_paineis/composicao` |

## Backend

- **App:** `backend/apps/configurador_paineis/composicao_painel/`
- **Models:** itens de composição, vínculo com cargas/produtos
- **Services:**
  - `services/sugestoes/` — execução por carga, minidisjuntor, etc.
  - `reprocessar_composicao_carga` — reprocessamento
  - Orquestrador de pendências (testes em `test_orquestrador_pendencias.py`)

## Frontend

- **Páginas:** `ComposicaoPage`
- **Registry:** `composicao.registry.tsx` (tipos de linha / UI)
- **Mutations:** inclusão manual, aprovação de sugestões

## Fluxos do usuário

1. Visualizar composição do projeto ou carga.
2. Executar sugestões / reprocessar.
3. Aprovar, rejeitar ou incluir itens manualmente no catálogo.
4. Resolver pendências antes de fechar o painel.

## Exportação (RF-08)

| Formato | API | Frontend |
|---------|-----|----------|
| XLSX | `GET /api/v1/composicao/projeto/{id}/export/xlsx/` | `exportarComposicaoListaXlsx` |
| PDF | `GET /api/v1/composicao/projeto/{id}/export/pdf/` | `exportarComposicaoListaPdf` |

Views: `ComposicaoExportXlsxView`, `ComposicaoExportPdfView` em `composicao_painel/api/views.py`.

## Relatório de conformidade

Preencher por projeto conforme [relatorio-conformidade.md](../../portfolio/relatorio-conformidade.md) (RNF-15).

## A documentar

- [ ] Ciclo de vida de uma sugestão (pendente → aprovada)
- [ ] Cabeçalho de export com versão de catálogo/regras (RF-03)
- [ ] Integração com orçamentos (RF-07/09)
