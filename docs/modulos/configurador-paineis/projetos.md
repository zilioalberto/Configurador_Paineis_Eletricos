# Projetos (configurador)

Cadastro e gestão de **projetos de painel** — ponto de entrada do fluxo de engenharia.

## Objetivo

Identificar o painel (cliente, código, recursos, fluxo de etapas) e agrupar cargas, dimensionamento e composição.

## Status

| Camada | Status |
|--------|--------|
| Backend | Implementado — `apps.configurador_paineis.projetos` |
| Frontend | Implementado — `configurador_paineis/projetos` |

## Backend

- **App:** `backend/apps/configurador_paineis/projetos/`
- **API:** `api/` (ViewSets, serializers)
- **Models:** identificação do projeto, vínculos com cliente/recursos

## Frontend

- **Páginas:** listagem, detalhe, wizard de projeto (`ProjetoWizardPage`, formulários em `components/`)
- **Hooks:** `useProjeto*Query`, mutations de create/update

## Fluxos do usuário

1. Listar projetos existentes.
2. Criar novo projeto (formulário ou wizard).
3. Abrir projeto e seguir para cargas / dimensionamento / composição.

## A documentar

- [ ] Campos obrigatórios e validações do formulário
- [ ] Estados do fluxo (stepper) e transições
- [ ] Endpoints REST e exemplos de payload
