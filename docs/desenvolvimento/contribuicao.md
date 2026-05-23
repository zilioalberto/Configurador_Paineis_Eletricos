# Contribuição

Fluxo de trabalho para alterações no repositório.

## Branches

- `main` — linha estável
- `dev` — integração contínua
- Feature branches a partir de `dev` ou `main`, conforme acordo da equipe

## Pull requests

Use o template em `.github/pull_request_template.md`.

Inclua no PR:

- Resumo do que mudou e por quê
- Como testar (passos manuais ou comandos)
- Impacto em migrações, `.env` ou infra

## CI (GitHub Actions)

Workflow: `.github/workflows/ci.yml`

| Job | O que valida |
|-----|----------------|
| **backend** | `pytest backend` com cobertura, `compileall` |
| **frontend** | `npm test`, lint/build conforme workflow |

Settings de teste do backend: `DJANGO_SETTINGS_MODULE=config.settings_ci`, `PYTHONPATH=backend`.

Cobertura agregada para Sonar: `scripts/patch_cobertura_for_sonar.py`.

## Qualidade de código

- **Sonar**: `.github/workflows/sonar.yml` + `sonar-project.properties`
- **Coverage**: `.coveragerc` na raiz e `backend/.coveragerc`

## Documentação

Ao implementar ou alterar um módulo:

1. Confirme se a mudança está no **escopo do portfólio** ([escopo-portfolio.md](../visao-geral/escopo-portfolio.md)) — priorize documentação do `configurador_paineis` / wizard.
2. Atualize o doc em `docs/modulos/<slug>.md` (status, fluxos, endpoints).
3. Se o módulo for novo no roadmap, registre em `backend/config/erp_registry.py`.
4. Atualize [modulos-erp.md](../visao-geral/modulos-erp.md) se o **status** ou a coluna **Portfólio** mudar.

Template: [modulos/_template.md](../modulos/_template.md).

## Commits

Mensagens claras em português ou inglês (seja consistente na equipe). Prefira o imperativo: *Adiciona validação de apontamento*, *Corrige cálculo de corrente*.
