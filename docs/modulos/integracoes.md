# Integrações

## Objetivo

E-mail, WhatsApp, fiscal (sincronização SEFAZ nativa com certificado A1 — ver [fiscal.md](fiscal.md)), bancos, APIs futuras e logs.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Stub** — `apps.integracoes` |
| Fiscal SEFAZ (A1) | **Ativo** — sincronização nativa no servidor (ver [fiscal.md](fiscal.md)) |
| Frontend | *Planejado* |

**ID ERP:** `integracoes` · **Área:** Transversal

## A documentar

- [ ] Conectores e gestão segura de credenciais

**Registry:** `backend/config/erp_registry.py` → `integracoes`
