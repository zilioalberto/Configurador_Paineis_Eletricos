# Tarefas

> **Portfólio:** **fora do escopo do RFC** (evolução ERP). Ver [escopo do portfólio](../visao-geral/escopo-portfolio.md).

## Objetivo

Kanban, responsáveis, prazos e **apontamento de horas** colaborativas.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Implementado** — `apps.tarefas` |
| Frontend | **Implementado** — `src/modules/tarefas` |

**ID ERP:** `tarefas` · **Área:** Execução

## Backend

- **App:** `backend/apps/tarefas/`
- **API:** tarefas, apontamentos, relatórios de horas
- **Testes:** validação de apontamento, etc.

## Frontend

- Kanban (`TarefasKanbanBoard`, views)
- Gestão de horas (`HorasGestaoPage`, relatórios por período/colaborador)

## Backlog relacionado

Quadro gerencial de horas por colaborador/dia: [backlog.md](../backlog.md).

## Testes

```bash
pytest backend/apps/tarefas -q
cd frontend && npm test -- tarefas
```

## A documentar

- [ ] Modelo de tarefa e estados do Kanban
- [ ] Regras de apontamento (limites, aprovação)
- [ ] Endpoints de relatório de horas
