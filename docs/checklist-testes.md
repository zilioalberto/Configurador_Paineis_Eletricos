# Checklist de testes — caminho crítico (RFC)

Checklist mínimo para avaliação do **MVP** conforme [RFC](rfc.pdf). Foco no **wizard** e catálogo.

> **Última execução automatizada:** 2026-05-23 — commit `f740b69`  
> Backend: **467 passed** (configurador_paineis + catalogo + auth)  
> Frontend: **356 passed** (configurador_paineis + catalogo + auth)

Testes automatizados **não substituem** walkthrough manual na UI antes da demo (M7).

---

## Pré-requisitos

- [x] Ambiente documentado — [setup-local](desenvolvimento/setup-local.md)
- [ ] Usuário de teste (perfil Engenharia ou Admin) criado no ambiente de demo
- [ ] Catálogo com conjunto mínimo de componentes carregado

---

## RF-01 — Autenticação

- [x] Login JWT — `POST /api/v1/auth/token/` (`config/tests/test_auth_views.py`)
- [x] Endpoint `/auth/me/` — testes auth
- [x] Guards UI — `RequireAuth.test.tsx`, `RequirePermission.test.tsx`
- [ ] Walkthrough manual: login → logout no navegador

---

## RF-02 / RF-10 — Catálogo

- [x] API produtos — `apps/catalogo/tests/test_catalogo_api_views.py`
- [x] Busca `?search=` — `ProdutoViewSet.get_queryset`
- [x] UI listagem/form — `ProdutoListPage.test.tsx`, `ProdutoForm.test.tsx`
- [ ] Walkthrough manual: criar/editar produto com specs

---

## RF-04 / RF-05 / RF-06 — Wizard

- [x] Wizard renderiza etapas — `ProjetoWizardPage.test.tsx`
- [x] API projetos + histórico — `test_projetos_api_views.py`
- [x] API cargas — `test_cargas_api.py`
- [x] Dimensionamento recalcular/condutores — `test_dimensionamento_api_views.py`
- [x] Dimensionamento mecânico + disposição na placa — `test_disposicao_componentes.py`, `test_dimensionamento_mecanico_service.py`, `disposicaoComponentes.test.ts`
- [x] Layout responsivo (master-detail, NF-e, orçamento) — `AppMasterDetailLayout.test.tsx`, `NfeImportPage.test.tsx`, `OrcamentoDetailPage.test.tsx`, `RhPage.test.tsx`, `useMediaQuery.test.ts`
- [x] Validações normativas — `test_validar_escolhas*.py`
- [x] Composição + sugestões + alternativas — `test_composicao_api_views.py`
- [x] UI composição — `ComposicaoPage.test.tsx`
- [ ] Walkthrough manual: fluxo completo `/projetos/:id/fluxo/cargas` → composição

---

## RF-07 — BoM e custos

- [x] Snapshot composição — `test_get_snapshot_estrutura`
- [x] Totais no wizard — `useProjetoWizardFluxo` (testes indiretos via `ProjetoWizardPage`)
- [ ] Totais/preços comerciais integrados ao orçamento (RF-07 parcial)
- [ ] Walkthrough manual: revisar lista de materiais na composição

---

## RF-08 — Exportação

- [x] Export XLSX — `test_export_xlsx` (backend) + `composicaoService.test.ts`
- [x] Export PDF — `test_export_pdf_anexo` (backend) + `composicaoService.test.ts`
- [ ] Walkthrough manual: baixar PDF/XLSX na UI e abrir arquivos
- [ ] Cabeçalho com versão catálogo/regras (RF-03 — pendente)

---

## RF-09 — Propostas

- [x] CRUD projeto — `test_projetos_api_views.py`
- [x] Histórico projeto — `test_historico_projeto_retorna_eventos`
- [ ] Estados comercial (rascunho/revisão/aprovado) no orçamento
- [ ] Walkthrough manual: criar e reabrir projeto piloto

---

## RNF — smoke não funcional

- [x] Healthcheck — `GET /api/v1/health/` (`config/health_views.py`)
- [x] CI verde — pytest + vitest (2026-05-23, commit `f740b69`)
- [ ] p95 ≤ 500 ms medido em ambiente de avaliação
- [ ] Deploy público HTTPS documentado no README

---

## Regressão automatizada (comandos)

```bash
# Backend (raiz)
set PYTHONPATH=backend
set DJANGO_SETTINGS_MODULE=config.settings_ci
pytest backend/apps/configurador_paineis backend/apps/catalogo backend/config/tests/test_auth_views.py -q

# Frontend
cd frontend
npm test -- configurador_paineis catalogo auth
```

---

## Resultado da execução

| Data | Ambiente | Executor | Automatizado | Manual UI | Observações |
|------|----------|----------|--------------|-----------|-------------|
| 2026-05-23 | local / Docker | validação API (`validar-demo-api.ps1`) | ☑ Sim (823 testes CI + fluxo API) | ☐ Pendente UI | Projeto `79bc11b9-…`; export PDF/XLSX OK |

---

## Antes do Demo Day (M7)

- [ ] Preencher relatório piloto com UUID e totais reais
- [ ] Gravar ou scriptar demo de 5–10 min (wizard → export)
- [ ] Publicar URL de deploy no README (item Tabela 1 RFC)
