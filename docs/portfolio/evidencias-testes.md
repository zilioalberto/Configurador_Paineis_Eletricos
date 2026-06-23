# Evidências de testes e cobertura

Este documento registra a cobertura de testes do projeto em relação aos requisitos da linha Web Apps do portfólio: cobertura mínima de 75% no backend e 25% no frontend. Também considera o alvo definido no RFC do projeto, que estabelece cobertura mínima de 20% para o MVP (RNF-12).

Os resultados abaixo foram consolidados a partir das execuções locais e dos relatórios consumidos pelos workflows de CI e pelo SonarCloud. Como a base segue em evolução, estes números devem ser tratados como uma fotografia da medição registrada, e não como valor fixo permanente.

## Resumo

| Camada | Métrica principal | Resultado | Meta | Situação |
|--------|-------------------|-----------|------|----------|
| Backend (Python/pytest) | Cobertura de linhas | **87,78%** | >= 75% | Acima da meta |
| Frontend (Vitest/v8) | Cobertura de linhas | **84,92%** | >= 25% | Acima da meta |
| Frontend (Vitest/v8) | Cobertura de funções | 75,02% | Não definida | Registrado como evidência complementar |
| Frontend (Vitest/v8) | Cobertura de branches | 74,12% | Não definida | Registrado como evidência complementar |

Volume de testes no momento da medição:

- **Backend:** aproximadamente 991 testes com pytest, executados no container `configurador_painel_backend`.
- **Frontend:** suíte Vitest sobre arquivos `src/**/*.test.ts` e `src/**/*.test.tsx`.

## Como reproduzir

### Backend

```bash
docker exec configurador_painel_backend python -m pytest --cov=apps --cov=core --cov-report=term-missing -q
```

Observação: os testes `test_catalogo_frontend_parity.py` leem arquivos de `frontend/src` por caminho relativo ao repositório. Eles passam no CI, onde o checkout contém o monorepo completo, mas podem falhar se o pytest for executado de dentro do container do backend sem a pasta `frontend/` montada. Esse comportamento é uma limitação do ambiente de execução, não uma regressão funcional.

### Frontend

```bash
cd frontend
npm run test:coverage
```

O relatório `lcov` é gerado em `frontend/coverage/lcov.info` e consumido pelo SonarCloud conforme configuração em `sonar-project.properties`.

## Integração com CI e SonarCloud

- A suíte roda nos workflows `.github/workflows/ci.yml` e `.github/workflows/sonar.yml`.
- O backend publica `coverage.xml`, usado por `sonar.python.coverage.reportPaths`.
- O frontend publica `frontend/coverage/lcov.info`, usado por `sonar.javascript.lcov.reportPaths`.
- A análise estática e a consolidação de cobertura ficam centralizadas no SonarCloud.

## Leitura dos resultados

A cobertura registrada atende aos mínimos exigidos para a linha Web Apps e dá margem para avaliar o caminho crítico do MVP com segurança razoável. O foco dos testes está no fluxo principal descrito no RFC: wizard, cargas, dimensionamento, composição de materiais e exportação de BoM.

Para a avaliação final, este documento deve ser lido em conjunto com o [checklist de testes](../checklist-testes.md), que lista os casos automatizados e os pontos de walkthrough manual antes da apresentação.

