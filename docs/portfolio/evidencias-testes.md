# Evidências de testes e cobertura

Este documento registra a cobertura de testes do projeto frente aos **requisitos obrigatórios da
linha Web Apps** do portfólio (cobertura mínima de **75% no backend** e **25% no frontend**) e
ao alvo do próprio RFC (≥ 20% no MVP, RNF-12).

> As metas obrigatórias são **superadas com folga** em ambas as camadas.

## Resumo

| Camada | Métrica principal | Resultado | Meta (linha Web Apps) | Situação |
|--------|-------------------|-----------|-----------------------|----------|
| Backend (Python/pytest) | Cobertura de linhas | **87,78%** | ≥ 75% | ✅ supera |
| Frontend (Vitest/v8) | Cobertura de linhas | **84,92%** | ≥ 25% | ✅ supera |
| Frontend (Vitest/v8) | Cobertura de funções | 75,02% | — | ✅ |
| Frontend (Vitest/v8) | Cobertura de branches | 74,12% | — | ✅ |

Volume de testes (no momento da medição):

- **Backend:** ~991 testes (pytest), executados no container `configurador_painel_backend`.
- **Frontend:** suíte Vitest sobre `src/**/*.test.ts(x)`.

## Como reproduzir

### Backend

```bash
docker exec configurador_painel_backend python -m pytest --cov=apps --cov=core --cov-report=term-missing -q
```

> Nota: os testes `test_catalogo_frontend_parity.py` leem arquivos de `frontend/src` por caminho
> relativo ao repositório. Eles passam no **CI** (checkout completo do monorepo), mas falham se
> o pytest for executado **dentro do container do backend**, onde a árvore `frontend/` não está
> montada. Isso é um artefato de ambiente, não uma regressão.

### Frontend

```bash
cd frontend
npm run test:coverage
```

O relatório `lcov` é gerado em `frontend/coverage/lcov.info` (consumido pelo SonarCloud — ver
`sonar-project.properties`).

## Integração com CI e SonarCloud

- A suíte roda automaticamente nos workflows `.github/workflows/ci.yml` e `sonar.yml` a cada push.
- A cobertura é enviada ao **SonarCloud** (`sonar.python.coverage.reportPaths=coverage.xml` e
  `sonar.javascript.lcov.reportPaths=frontend/coverage/lcov.info`), atendendo ao requisito de
  **análise estática de código e segurança** da linha de projeto.

## Observações

- A medição de cobertura é um retrato pontual; os percentuais podem variar levemente conforme a
  evolução do código. O relevante para o portfólio é a **larga margem** sobre os mínimos
  obrigatórios.
- O caminho crítico do RFC (wizard → cargas → dimensionamento → composição/BoM) está coberto por
  testes de serviço e de API; ver [checklist de testes](../checklist-testes.md).
