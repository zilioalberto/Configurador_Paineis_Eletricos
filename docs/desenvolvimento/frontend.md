# Frontend (React)

Interface em `frontend/` — React 19, TypeScript, Vite, React Router, TanStack Query, Bootstrap.

## Layout

```
frontend/src/
├── components/       # UI compartilhada (layout, tabelas, etc.)
├── modules/          # Domínios alinhados ao ERP
│   ├── auth/
│   ├── catalogo/
│   ├── configurador_paineis/
│   │   ├── projetos/
│   │   ├── cargas/
│   │   ├── dimensionamento/
│   │   ├── composicao/
│   │   └── dashboard/
│   ├── erp/
│   ├── fiscal/
│   ├── tarefas/
│   └── modulos/      # launcher de módulos
├── services/         # apiClient, interceptors
└── …
```

## Scripts (`package.json`)

| Comando | Descrição |
|---------|-----------|
| `npm run dev` | Servidor Vite (porta 5173) |
| `npm run dev:remote` | Dev com modo `remote` (API remota) |
| `npm run build` | `tsc -b` + build de produção |
| `npm run lint` | ESLint |
| `npm test` | Vitest (uma execução) |
| `npm run test:coverage` | Vitest com cobertura |

## Padrões por módulo

| Pasta / arquivo | Uso |
|-----------------|-----|
| `pages/` | Rotas e telas |
| `components/` | Formulários, tabelas, wizards |
| `hooks/` | React Query (`use*Query`, `use*Mutation`) |
| `services/` | Chamadas HTTP à API |
| `types/` | Tipos TypeScript |
| `*QueryKeys.ts` | Chaves de cache do React Query |

## API

- Cliente HTTP: `src/services/apiClient.ts`
- Módulo ERP (meta de módulos, orçamentos): `src/modules/erp/`
- Autenticação JWT: `src/modules/auth/`

## Testes

- Framework: **Vitest** + Testing Library + `happy-dom`
- Setup: `src/test/setupTests.ts`
- Convenção: arquivos `*.test.ts` / `*.test.tsx` ao lado do código

```bash
cd frontend
npm test
```

## Variáveis de ambiente

- `frontend/.env.development` — URL da API em desenvolvimento
- Não commitar segredos; seguir `.env.example` na raiz para variáveis compartilhadas com Docker

## A documentar

- [ ] Mapa de rotas (`react-router` — arquivo principal de rotas)
- [ ] Matriz de permissões UI (`RequirePermission`, etc.)
- [ ] Convenções de formulários e validação
