# Rastreabilidade — RFC × repositório

Matriz de aderência dos requisitos do **[RFC](../rfc.pdf)** à implementação. Prefixo de API: **`/api/v1/`** (ver `backend/config/urls.py`).

**Legenda:** OK · Parcial · Planejado · N/A

---

## RF-01 — Autenticação e perfis

| Item | Status | Backend | Frontend |
|------|--------|---------|----------|
| Login JWT | OK | `POST /api/v1/auth/token/` — `config/jwt_views.py` (`ZfwTokenObtainPairView`) | `modules/auth/` — `AuthContext` |
| Refresh | OK | `POST /api/v1/auth/token/refresh/` | Interceptor em `services/apiClient.ts` |
| Usuário atual | OK | `GET /api/v1/auth/me/` — `config/auth_views.py` | Consumido pelo contexto de auth |
| CRUD usuários (admin) | OK | `apps/accounts/api/views.py`, rotas em `apps/accounts/api/urls.py` | `modules/usuarios/` (se habilitado no menu) |
| Permissões RBAC | Parcial | `core/permissions.py` (`PermissionKeys`), `HasEffectivePermission` | `permissionKeys.ts`, `RequirePermission`, `RequireAuth` |
| Perfis RFC (Comercial, Engenharia, Admin) | Parcial | Mapear grupos/tipos em `apps.accounts` — alinhar nomenclatura ao RFC | Documentar matriz perfil → permissões |

**Testes:** `backend/config/tests/test_auth_views.py`, `frontend/src/modules/auth/*.test.tsx`

---

## RF-02 — Catálogo de componentes

| Item | Status | Backend | Frontend |
|------|--------|---------|----------|
| CRUD produtos | OK | `ProdutoViewSet` — `apps/catalogo/api/views.py` | `modules/catalogo/pages/ProdutoListPage`, formulários |
| Categorias | OK | `CategoriaProdutoViewSet` — `apps/catalogo/api/urls.py` | `useCategoriaListQuery`, specs por categoria |
| Atributos técnicos (nested) | OK | Serializers em `apps/catalogo/api/serializers.py`, models em `apps/catalogo/models/` | `specFormHelpers`, `produtoPayload` |
| Importação NF-e | Parcial | `NfeCatalogo*View` — `apps/catalogo/api/nfe_import_views.py` | `nfeImportService.ts` |

**API principal**

| Método | Caminho |
|--------|---------|
| GET/POST | `/api/v1/catalogo/produtos/` |
| GET/PUT/PATCH/DELETE | `/api/v1/catalogo/produtos/{id}/` |
| GET/POST | `/api/v1/catalogo/categorias/` |

**Testes:** `backend/apps/catalogo/tests/`, `frontend/src/modules/catalogo/**/*.test.ts*`

---

## RF-03 — Versões de catálogo / regras (snapshot)

| Item | Status | Evidência |
|------|--------|-----------|
| Snapshot de composição por projeto | Parcial | `GET /api/v1/composicao/projeto/{projeto_id}/` — `ComposicaoProjetoSnapshotView` |
| Versão imutável catálogo+regras por proposta (RF-03) | Planejado | Modelo `Snapshot` do RFC ainda não versionado globalmente |
| Reprodutibilidade histórica | Planejado | Documentar quando `snapshot_id` em proposta existir |

---

## RF-04 — Assistente de configuração (wizard)

| Item | Status | Evidência |
|------|--------|-----------|
| Página wizard integrada | OK | `frontend/.../projetos/pages/ProjetoWizardPage.tsx` |
| Hook de fluxo / etapas | OK | `useProjetoWizardFluxo.ts` — etapas: `projeto`, `cargas`, `dimensionamento`, `composicao` |
| Rota UI | OK | `/projetos/:id/fluxo/:etapa` — `projetos.registry.tsx` |
| Checklist e histórico no wizard | OK | `ProjetoWizardOverview.tsx`, `GET /api/v1/projetos/{id}/historico/` |
| Mapeamento RFC (alimentação→…→acessórios) | Parcial | Tabela em [configurador-paineis/README.md](../modulos/configurador-paineis/README.md) |

**Telas auxiliares do fluxo (fora da rota `/fluxo/`)**

| Etapa | Rota UI | Registry |
|-------|---------|----------|
| Cargas | `/cargas`, `/cargas/:id` | `cargas.registry.tsx` |
| Dimensionamento | `/dimensionamento` | `dimensionamento.registry.tsx` |
| Composição / BoM | `/composicao` | `composicao.registry.tsx` |

---

## RF-05 — Validações técnico-normativas

| Item | Status | Evidência |
|------|--------|-----------|
| Recálculo dimensionamento | OK | `POST /api/v1/dimensionamento/projeto/{id}/recalcular/` — `DimensionamentoRecalcularView` |
| Leitura dimensionamento | OK | `GET /api/v1/dimensionamento/projeto/{id}/` |
| Confirmação condutores | OK | `PATCH /api/v1/dimensionamento/projeto/{id}/condutores/` |
| Validação de escolhas (corrente, Iz, neutro, PE) | OK | `dimensionamento/services/circuitos/validar_escolhas.py` |
| Cálculo condutores (NBR 5410 ref.) | Parcial | `core/calculos/condutores.py` (comentários normativos; expandir metadado RNF-14) |
| Serviços por circuito | OK | `dimensionamento/services/circuitos/` (ex.: `alimentacao_geral.py`) |

**Testes:** `backend/apps/configurador_paineis/dimensionamento/tests/test_validar_escolhas*.py`, `test_dimensionamento_api_views.py`

---

## RF-06 — Sugestões de alternativas

| Item | Status | Evidência |
|------|--------|-----------|
| Gerar sugestões | OK | `POST /api/v1/composicao/projeto/{id}/gerar-sugestoes/` |
| Alternativas por sugestão | OK | `GET /api/v1/composicao/sugestoes/{id}/alternativas/` — `SugestaoAlternativasView` |
| Aprovar sugestão | OK | `POST /api/v1/composicao/sugestoes/{id}/aprovar/` |
| Orquestrador | OK | `composicao_painel/services/sugestoes/orquestrador.py`, `gerar_sugestoes_painel` |
| Reavaliar pendências | OK | `POST .../reavaliar-pendencias/` |

**Frontend:** `composicaoService.ts` — `gerarSugestoesComposicao`, `listarAlternativasSugestao`, `aprovarSugestao`

---

## RF-07 — BoM e custos

| Item | Status | Evidência |
|------|--------|-----------|
| Snapshot BoM (itens, sugestões, pendências) | OK | `ComposicaoProjetoSnapshotView`, tipos em `composicao/types/composicao.ts` |
| Inclusão manual | OK | `POST .../inclusoes-manuais/`, `DELETE .../inclusoes-manuais/{id}/` |
| Totais no wizard | OK | `useProjetoWizardFluxo` — `composicao.totais` |
| Preços / markup / impostos configuráveis | Parcial | `apps/orcamentos` — `Orcamento`, `OrcamentoItem`; integrar com BoM do painel |
| Orçamento comercial (proposta) | Parcial | `GET/POST /api/v1/erp/orcamentos/`, `OrcamentoDetailView` |

---

## RF-08 — Exportações (PDF / CSV)

| Item | Status | Evidência |
|------|--------|-----------|
| Exportação XLSX (lista BoM) | OK | `GET /api/v1/composicao/projeto/{id}/export/xlsx/` — `ComposicaoExportXlsxView` |
| Exportação PDF | OK | `GET /api/v1/composicao/projeto/{id}/export/pdf/` — `ComposicaoExportPdfView` |
| Download no frontend | OK | `exportarComposicaoListaXlsx`, `exportarComposicaoListaPdf` — `composicaoService.ts` |
| Cabeçalho rastreabilidade (versão catálogo/regras) | Parcial | Verificar conteúdo gerado nos exports; incluir `snapshot` quando RF-03 existir |
| CSV dedicado (RFC menciona CSV) | Parcial | XLSX cobre lista; CSV explícito se exigido pelo avaliador |

---

## RF-09 — Gestão de propostas

| Item | Status | Evidência |
|------|--------|-----------|
| CRUD projeto (engenharia) | OK | `ProjetoViewSet` — `apps/configurador_paineis/projetos/api/views.py` |
| API projetos | OK | `/api/v1/projetos/` (router DRF) |
| Histórico / auditoria projeto | OK | `GET /api/v1/projetos/{id}/historico/` — action `historico` |
| CRUD orçamento (comercial) | Parcial | `/api/v1/erp/orcamentos/` — `apps/orcamentos/api/views.py` |
| Estados (rascunho, revisão, aprovado) | Parcial | Verificar model `Orcamento` / `Projeto` — completar máquina de estados do RFC |
| UI orçamentos | Parcial | `OrcamentoListPage`, `OrcamentoDetailPage` — `modules/erp/` |

---

## RF-10 — Busca e filtro no catálogo

| Item | Status | Evidência |
|------|--------|-----------|
| Busca textual (`?search=`) | OK | `ProdutoViewSet.get_queryset` — tokenização, limite 40 |
| Filtro por categoria (`?categoria=`) | OK | Mesmo `get_queryset` |
| Paginação lista | OK | `page`, `page_size` na listagem |
| Filtros avançados por atributo técnico | Parcial | Expandir query params conforme specs do catálogo |

---

## RNF — amostra com evidência

| ID | Requisito | Status | Evidência |
|----|-----------|--------|-----------|
| RNF-01 | p95 ≤ 500 ms | Planejado | Medir em staging; sem relatório no repo |
| RNF-03 | Disponibilidade ≥ 99% | Planejado | Deploy + `infra/monitoring/` |
| RNF-10 | Wizard ≤ 10 cliques (caso simples) | Parcial | Revisar `ProjetoWizardPage` + rotas |
| RNF-12 | Cobertura ≥ 20%, CI por push | Parcial | `.github/workflows/ci.yml`, pytest + vitest |
| RNF-13 | Logs / healthcheck | OK | `GET /api/v1/health/` — `config/health_views.py`; prometheus em settings |
| RNF-14 | Regra referencia norma | Parcial | `core/calculos/condutores.py`; padronizar metadado nas regras |
| RNF-15 | Relatório de conformidade | Parcial | Guia: [relatorio-conformidade.md](relatorio-conformidade.md) |

---

## Mapa rápido — API do caminho crítico (wizard)

```text
POST   /api/v1/auth/token/
GET    /api/v1/auth/me/
GET    /api/v1/projetos/
POST   /api/v1/projetos/
GET    /api/v1/projetos/{id}/historico/
GET    /api/v1/cargas/?projeto={id}
POST   /api/v1/dimensionamento/projeto/{id}/recalcular/
GET    /api/v1/dimensionamento/projeto/{id}/
PATCH  /api/v1/dimensionamento/projeto/{id}/condutores/
GET    /api/v1/composicao/projeto/{id}/
POST   /api/v1/composicao/projeto/{id}/gerar-sugestoes/
GET    /api/v1/composicao/projeto/{id}/export/xlsx/
GET    /api/v1/composicao/projeto/{id}/export/pdf/
GET    /api/v1/catalogo/produtos/?search=...
```

---

## Mapa rápido — rotas UI (wizard)

| Rota | Componente |
|------|------------|
| `/projetos` | `ProjetoListPage` |
| `/projetos/novo` | `ProjetoCreatePage` |
| `/projetos/:id/fluxo/:etapa` | `ProjetoWizardPage` |
| `/cargas` | `CargaListPage` |
| `/dimensionamento` | `DimensionamentoPage` |
| `/composicao` | `ComposicaoPage` |
| `/catalogo` (módulo catálogo) | Listagem/form produtos |

---

## Itens obrigatórios — linha Web Apps (RFC Tabela 1)

| Item | Status | Artefato |
|------|--------|----------|
| Deploy público HTTPS | Planejado | URL a documentar no README |
| Domínio real MVP | Parcial | Wizard + catálogo + BoM + export — ver RF acima |
| C4 documentado | Parcial | [arquitetura.md](../visao-geral/arquitetura.md) |
| Git + CI | OK | `.github/workflows/ci.yml` |
| README + checklist | OK | [README.md](../../README.md), [checklist-testes.md](../checklist-testes.md) |
| Testes caminho crítico | Parcial | Ver comandos no checklist |
| Relatório conformidade | Parcial | [relatorio-conformidade.md](relatorio-conformidade.md) |

---

## Fora do escopo RFC

Módulos com **Portfólio = Não** em [modulos-erp.md](../visao-geral/modulos-erp.md) (`tarefas`, `crm`, `estoque`, …) — não contar como gap do MVP.

---

## Manutenção

Ao implementar um RF, atualize a coluna **Status** e adicione o caminho do arquivo ou endpoint. Commits sugeridos: `docs: rastreabilidade RF-0X`.
