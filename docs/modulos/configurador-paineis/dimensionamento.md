# Dimensionamento (configurador)

Cálculos e escolhas técnicas de proteção, comando e condutores por carga.

## Objetivo

Aplicar regras normativas e de engenharia para dimensionar circuitos a partir dos dados das cargas e do catálogo.

## Status

| Camada | Status |
|--------|--------|
| Backend | Implementado — `apps.configurador_paineis.dimensionamento` |
| Frontend | Implementado — `configurador_paineis/dimensionamento` |

## Backend

- **App:** `backend/apps/configurador_paineis/dimensionamento/`
- **Services:** `services/circuitos/` (ex.: `alimentacao_geral`, validação de escolhas)
- **Services:** correntes, fonte 24V, condutores (`core/calculos/condutores.py`)
- **Testes:** ampla suíte em `dimensionamento/tests/`

## Frontend

- **Páginas:** `DimensionamentoPage`, shell de wizard
- **Componentes:** painéis de condutores, escolhas por etapa

## Fluxos do usuário

1. Abrir dimensionamento de uma carga ou projeto.
2. Revisar resultados calculados e escolhas sugeridas.
3. Ajustar escolhas manuais quando permitido.
4. Validar antes de gerar/atualizar composição.

## A documentar

- [ ] Mapa serviço ↔ tipo de carga
- [ ] Normas e fórmulas (referência no glossário)
- [ ] API de patch de condutores e estados de erro
