# ADR 0003 — Autenticação JWT + RBAC por permissão efetiva

- **Status:** Aceito
- **Data:** 2025
- **Relacionado:** RFC §3.4.2, RF-01, RNF-06/07

## Contexto

O sistema precisa de autenticação e controle de acesso por perfis (Comercial, Engenharia,
Admin) com trilha de auditoria, atendendo ao OWASP Top 10 essencial, sem introduzir a
complexidade de um provedor de identidade externo no MVP.

## Decisão

- **Autenticação:** **JWT** via `djangorestframework-simplejwt` (access de TTL curto + refresh),
  token no header `Authorization: Bearer`.
- **Autorização:** **RBAC** com checagem de **permissão efetiva** no backend
  (`HasEffectivePermission`) e equivalente no frontend (`RequirePermission` / `PERMISSION_KEYS`).
- **Frontend:** `apiClient` centraliza envio do Bearer e refresh automático.

## Alternativas consideradas

- **Keycloak / OAuth2 com IdP externo** — descartado para o MVP por complexidade; registrado
  como evolução futura (login social/MFA é "diferencial" na linha de projeto).
- **Sessão por cookie** — descartado por aumentar superfície de CSRF numa SPA.

## Consequências

- ✅ Atende RF-01 e os requisitos mínimos de segurança (ASVS L1).
- ✅ Controle por rota/escopo antes de acessar recursos.
- ⚠️ Tokens no cliente exigem cuidado (TTL curto, refresh controlado) — mitigado no `apiClient`.
- ⚠️ MFA e login social ficam como evolução (fora do escopo do MVP).
