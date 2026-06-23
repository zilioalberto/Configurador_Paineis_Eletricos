# Conteúdo-base do pôster (Poster + Demo Day)

Texto pronto para diagramar o **pôster A0** exigido pela disciplina. Este arquivo é o *conteúdo*;
a arte final (A0, vertical, fonte mínima 20 pt, cores de alto contraste) deve ser montada em uma
ferramenta de design e exportada em **PDF** com **QR Code** apontando para a aplicação pública.

> Requisitos de formato (Portfolio.md): A0 vertical · fonte ≥ 20 pt · alto contraste · título,
> autores e e-mails · contexto/problema/solução · arquitetura e decisões técnicas · QR Code.

---

## Título

**Configurador de Painéis Elétricos — CPQ com validação técnico-normativa**
*Módulo de auxílio à escolha de materiais para orçamentos de painéis elétricos de baixa tensão*

## Autores

- Alberto Zilio — Engenharia de Software, Católica SC — `e-mail@dominio` *(preencher)*
- Orientador(a): *(preencher)*

## Contexto e problema

Orçar painéis elétricos customizados exige selecionar e dimensionar **50–300 componentes** sob
regras técnicas rigorosas (corrente, tensão, IP, dissipação, coordenação de proteção). Hoje o
processo depende de **conhecimento tácito** de orçamentistas seniores, gerando ciclos de **6–12 h
por proposta** e **20–35% de retrabalho** (incompatibilidades, subdimensionamento, omissões) —
dado do estudo de caso ZFW Engenharia (2025).

## Solução proposta

Aplicação web **CPQ/PCS** que **guia** o orçamentista por um assistente passo a passo,
**valida** combinações em tempo real e gera **BoM (lista de materiais) + estimativa de custos**
rastreável e auditável.

Fluxo do wizard: **projeto → cargas → dimensionamento (regras) → composição/BoM → proposta**.

Diferenciais:

- Motor de regras com referência a **normas brasileiras** (NR-10, ABNT NBR 5410, IEC 61439).
- Catálogo estruturado + trilha de auditoria das decisões.
- Relatório de conformidade por proposta (regra ↔ norma).

## Arquitetura e decisões técnicas

- **Frontend:** React + TypeScript + Vite (SPA, wizard).
- **Backend:** Django + Django REST Framework — arquitetura em camadas com **Service Layer**.
- **Banco:** PostgreSQL.
- **Auth:** JWT + RBAC por permissão efetiva.
- **DevOps:** Docker Compose · CI/CD com GitHub Actions · deploy automatizado em VPS.
- **Observabilidade:** Prometheus + Grafana + Alertmanager · healthcheck.
- **Qualidade:** SonarCloud · cobertura **backend 87,8%** / **frontend 84,9%** (linhas).

> Decisões e desvios conscientes do RFC documentados em [ADRs](../adr/README.md).

*(Sugestão de elementos visuais: diagrama C4 Nível 2 — Containers, um print do wizard e um do
BoM/proposta gerada.)*

## Resultados / métricas-alvo (RFC §2.9)

- Redução ≥ **30%** no tempo de elaboração e ≥ **50%** em erros de composição vs. baseline.
- **p95 ≤ 500 ms** em busca/validação do wizard (evidenciável via Grafana).
- ≥ **80%** das regras essenciais do catálogo inicial cobertas.

## QR Code

Gerar QR apontando para a **URL pública da aplicação** *(preencher)* e posicionar em destaque no
rodapé do pôster.

---

## Checklist de produção do pôster

- [ ] Formato A0 vertical, fonte ≥ 20 pt, alto contraste.
- [ ] Título, autores e e-mails preenchidos.
- [ ] Contexto, problema e solução claros e sintéticos.
- [ ] Diagrama de arquitetura legível (C4 N2).
- [ ] QR Code testado (abre a aplicação pública).
- [ ] Exportado em **PDF**.
- [ ] Sem menção a módulos fora do escopo do RFC (fiscal/financeiro/estoque) — foco no CPQ.
