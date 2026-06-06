# Notificações

## Objetivo

Alertas internos, lembretes, avisos de vencimento e mensagens.

## Status

| Camada | Status |
|--------|--------|
| Backend | **MVP** — `NotificacaoInterna` + API `/api/v1/notificacoes/` |
| Frontend | Sino no cabeçalho (`NotificacoesHeaderPanel`) |

**ID ERP:** `notificacoes` · **Área:** Transversal

## API (utilizador autenticado)

- `GET /notificacoes/` — últimas 50 notificações
- `GET /notificacoes/contagem/` — `{ "nao_lidas": N }`
- `POST /notificacoes/{id}/marcar-lida/`
- `POST /notificacoes/marcar-todas-lidas/`

## Eventos atuais

- Cliente **aprova** ou **recusa** oferta pelo link público → alerta para quem enviou a oferta, criador e último editor da proposta.

## A documentar

- [ ] Fila e preferências por utilizador
- [ ] E-mail interno opcional além do sino

**Registry:** `backend/config/erp_registry.py` → `notificacoes`
