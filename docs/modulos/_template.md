# {Título do módulo}

> Copie este arquivo para `{slug}.md` e preencha as seções. Remova blocos que não se aplicarem.

**Portfólio (RFC):** Sim / Não / Suporte — ver [escopo-portfolio.md](../visao-geral/escopo-portfolio.md).

## Objetivo

<!-- Uma frase: para que serve este módulo? -->

## Status

| Camada | Status |
|--------|--------|
| Backend | Stub / Parcial / Implementado |
| Frontend | Stub / Parcial / Implementado |

**ID ERP:** `{slug}`  
**Área:** {área}  
**Pacote backend:** `apps.{pacote}`

## Backend

- **App:** `backend/apps/...`
- **Models principais:** <!-- listar -->
- **API:** <!-- prefixo de URL, ViewSets -->
- **Services:** <!-- regras importantes -->

## Frontend

- **Módulo:** `frontend/src/modules/...`
- **Páginas:** <!-- listar rotas/telas -->

## Fluxos do usuário

<!-- Passo a passo numerado -->

1. …
2. …

## Regras de negócio

<!-- O que não está óbvio no código -->

## Integrações

<!-- Outros módulos, eventos, filas -->

## Testes

```bash
# Backend
pytest backend/apps/{pacote} -q

# Frontend
cd frontend && npm test -- {caminho-opcional}
```

## Referências

- Metadados: `backend/config/erp_registry.py` → `{slug}`
- Código: <!-- links relativos ou caminhos -->

## A documentar

- [ ] Endpoints e payloads
- [ ] Diagrama de estados / entidades
- [ ] Permissões
