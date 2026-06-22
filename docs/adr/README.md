# Architecture Decision Records (ADRs)

Este diretório registra as **decisões arquiteturais relevantes** do projeto, no formato ADR
(Architecture Decision Record). Cada documento captura o contexto, a decisão tomada, as
alternativas consideradas e as consequências — incluindo **desvios conscientes em relação ao
RFC** e suas justificativas.

> O RFC (`docs/rfc.pdf`) é o compromisso de planejamento. Os ADRs documentam como esse
> planejamento foi materializado e onde (e por quê) o desenvolvimento divergiu da proposta
> inicial.

## Índice

| ADR | Título | Status |
|-----|--------|--------|
| [0001](0001-stack-tecnologica.md) | Stack tecnológica (Django + DRF, React + TS, PostgreSQL) | Aceito |
| [0002](0002-arquitetura-camadas-service-layer.md) | Arquitetura em camadas com Service Layer | Aceito |
| [0003](0003-autenticacao-jwt-rbac.md) | Autenticação JWT + RBAC por permissão efetiva | Aceito |
| [0004](0004-geracao-documentos-sincrona.md) | Geração de documentos síncrona (sem Celery/Redis no MVP) | Aceito (desvio do RFC) |
| [0005](0005-armazenamento-arquivos-local.md) | Armazenamento de arquivos local (sem S3/MinIO no MVP) | Aceito (desvio do RFC) |
| [0006](0006-integracao-sefaz-nativa-a1.md) | Integração SEFAZ nativa com certificado A1 | Aceito |
| [0007](0007-escopo-portfolio-cpq.md) | Escopo do portfólio limitado ao CPQ/configurador | Aceito |
| [0008](0008-observabilidade-prometheus-grafana.md) | Observabilidade com Prometheus + Grafana + Alertmanager | Aceito |
| [0009](0009-monorepo.md) | Organização em monorepo | Aceito |

## Formato

Cada ADR segue a estrutura:

- **Status** — proposto / aceito / substituído / depreciado.
- **Contexto** — forças e restrições que motivaram a decisão.
- **Decisão** — o que foi decidido.
- **Alternativas consideradas** — opções avaliadas e por que foram descartadas.
- **Consequências** — efeitos positivos e negativos da decisão.

Para registrar uma nova decisão, copie o cabeçalho de um ADR existente, incremente o número
sequencial e adicione a linha correspondente ao índice acima.
