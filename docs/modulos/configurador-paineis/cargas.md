# Cargas (configurador)

Cadastro de **cargas elétricas** por projeto: motores, resistências, alimentação geral, etc.

## Objetivo

Modelar cada circuito ou equipamento alimentado para alimentar o dimensionamento e a composição.

## Status

| Camada | Status |
|--------|--------|
| Backend | Implementado — `apps.configurador_paineis.cargas` |
| Frontend | Implementado — `configurador_paineis/cargas` |

## Backend

- **App:** `backend/apps/configurador_paineis/cargas/`
- **Models:** tipos de carga (ex.: motor, resistência) em `models/`
- **Testes:** `cargas/tests/` (models, I/O, validações)

## Frontend

- **Páginas:** `CargaListPage`, `CargaDetailPage`, `CargaEditPage`
- **Utilitários:** `cargaPayload`, `cargaModelos`, mappers de detalhe

## Fluxos do usuário

1. No contexto de um projeto, listar cargas.
2. Criar ou editar carga conforme o tipo (formulário dinâmico).
3. Disparar dimensionamento / composição a partir da carga.

## A documentar

- [ ] Tipos de carga suportados e campos por tipo
- [ ] Validações cruzadas (tensão, potência, fator de serviço)
- [ ] Relação carga → dimensionamento (1:1 ou 1:N)
