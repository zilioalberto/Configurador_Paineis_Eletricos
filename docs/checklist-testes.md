# Checklist de testes — caminho crítico (RFC)

Checklist mínimo para avaliação do **MVP** conforme [RFC](rfc.pdf). Foco no **wizard** e catálogo.

> **Última validação documentada:** 2026-06-23 — ambiente de produção (`https://portal.zfw.com.br`)  
> Projeto piloto: `06001-26` (`ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa`)  
> Evidências: [docs/portfolio/evidencias-producao](portfolio/evidencias-producao/README.md)

Testes automatizados **não substituem** walkthrough manual na UI antes da demo (M7).

---

## Pré-requisitos

- [x] Ambiente documentado — [setup-local](desenvolvimento/setup-local.md)
- [x] Usuário de teste criado: `demopac@zfw.com.br`
- [x] Catálogo suficiente para gerar 6 itens aprovados e registrar as ressalvas abertas no projeto piloto

---

## RF-01 — Autenticação

- [x] Login JWT — `POST /api/v1/auth/token/` (`config/tests/test_auth_views.py`)
- [x] Endpoint `/auth/me/` — testes auth
- [x] Guards UI — `RequireAuth.test.tsx`, `RequirePermission.test.tsx`
- [x] Walkthrough em produção: login registrado em `evidencias-producao/screenshots/01-login.png` e pós-login em `02-dashboard-pos-login.png`

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
- [x] Walkthrough em produção: fluxo de cargas, dimensionamento e composição registrado em `docs/portfolio/evidencias-producao/`

---

## RF-07 — BoM e custos

- [x] Snapshot composição — `test_get_snapshot_estrutura`
- [x] Totais no wizard — `useProjetoWizardFluxo` (testes indiretos via `ProjetoWizardPage`)
- [ ] Totais/preços comerciais integrados ao orçamento (RF-07 parcial)
- [x] Walkthrough em produção: composição do projeto `06001-26` com 6 itens aprovados na BoM

---

## RF-08 — Exportação

- [x] Export XLSX — `test_export_xlsx` (backend) + `composicaoService.test.ts`
- [x] Export PDF — `test_export_pdf_anexo` (backend) + `composicaoService.test.ts`
- [x] Exports gerados em produção: `composicao-06001-26.pdf` e `composicao-06001-26.xlsx`
- [ ] Cabeçalho com versão catálogo/regras (RF-03 — pendente)

---

## RF-09 — Propostas

- [x] CRUD projeto — `test_projetos_api_views.py`
- [x] Histórico projeto — `test_historico_projeto_retorna_eventos`
- [ ] Estados comercial (rascunho/revisão/aprovado) no orçamento
- [x] Projeto piloto criado e reaberto em produção: `06001-26`

---

## RNF — smoke não funcional

- [x] Healthcheck — `GET /api/v1/health/` (`config/health_views.py`)
- [x] CI documentado em GitHub Actions; evidências funcionais de produção registradas em 2026-06-23
- [ ] p95 ≤ 500 ms medido em ambiente de avaliação
- [x] Deploy público HTTPS documentado: `https://portal.zfw.com.br` e `https://api.zfw.com.br/api/v1/health/`

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
| 2026-06-23 | produção / VPS | portal público + API | Sim (fluxo API produção) | Sim (prints em `docs/portfolio/evidencias-producao/`) | Projeto `06001-26`; 6 itens BoM; PDF/XLSX gerados; 21 pendências documentadas |

---

## Antes do Demo Day (M7)

- [x] Relatório piloto preenchido com UUID e totais reais de produção
- [x] Prints e exports do roteiro salvos em `docs/portfolio/evidencias-producao/`
- [ ] Publicar documentação atualizada na branch `main` antes do envio final

