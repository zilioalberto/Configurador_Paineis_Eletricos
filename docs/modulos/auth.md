# Autenticação e contas

## Objetivo

Login JWT, sessão no frontend, perfis e permissões de acesso aos módulos.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Implementado** — `apps.accounts`, `config/jwt_views.py` |
| Frontend | **Implementado** — `src/modules/auth` |

**RFC:** **RF-01** (perfis Comercial, Engenharia, Admin). Não listado em `erp_registry.py`; infraestrutura do MVP.

## Backend

- **App:** `apps.accounts`
- **Config:** `AUTH_USER_MODEL`, serializers e views JWT em `backend/config/`

## Frontend

- `AuthContext`, `RequireAuth`, `RequirePermission`, `RequireAppAdmin`
- Testes de guards e contexto

## A documentar

- [ ] Matriz de permissões por módulo
- [ ] Refresh token e expiração
- [ ] Papéis (admin vs. usuário operacional)

## Testes

```bash
pytest backend/config/tests/test_auth_views.py -q
cd frontend && npm test -- auth
```
