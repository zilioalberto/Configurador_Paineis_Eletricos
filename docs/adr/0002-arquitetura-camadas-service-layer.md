# ADR 0002 — Arquitetura em camadas com Service Layer

- **Status:** Aceito
- **Data:** 2025
- **Relacionado:** RFC §3.2.2

## Contexto

A lógica de negócio do domínio (dimensionamento elétrico, regras de compatibilidade, sugestões
de componentes, composição de BoM) é complexa e precisa ser testável de forma isolada, sem
acoplamento ao framework web. Concentrar essa lógica em views/serializers tornaria o código
difícil de testar e manter.

## Decisão

Adotar **arquitetura em camadas** inspirada no padrão MTV do Django com **Service Layer**
explícita:

- **Apresentação:** Views/Serializers do DRF (entrada/saída HTTP, validação declarativa).
- **Aplicação:** `services/` por app — orquestram casos de uso e regras.
- **Domínio:** models e cálculos (`core/` para cálculos elétricos e choices compartilhados).
- **Infra:** ORM, persistência, geração de arquivos.

A regra de negócio fica **fora** das views; selectors/query objects isolam consultas complexas.

## Alternativas consideradas

- **Lógica nas views/viewsets (fat views)** — descartado por dificultar testes unitários e
  reuso.
- **Motor de regras pesado (Drools/engine externo)** — descartado; as regras determinísticas via
  tabelas + serviços são suficientes para o MVP (RFC §3.2.6).

## Consequências

- Serviços testáveis isoladamente — sustenta a meta de cobertura de testes.
- Separação clara de responsabilidades (critério obrigatório da linha Web Apps).
- Frontend espelha a organização modular do backend.
- Ponto de atenção: Exige disciplina para não vazar lógica para as views; revisado em code review.


