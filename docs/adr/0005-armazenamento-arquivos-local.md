# ADR 0005 — Armazenamento de arquivos local (sem S3/MinIO no MVP)

- **Status:** Aceito (desvio consciente do RFC)
- **Data:** 2025
- **Relacionado:** RFC §3.3.2

## Contexto

O RFC previu armazenamento de arquivos em storage **S3-compatível** (AWS S3 ou MinIO) com
`django-storages` + `boto3` e presigned URLs. Para o MVP, os artefatos gerados (PDF/DOCX/CSV de
ofertas, XMLs e PDFs fiscais) são servidos a partir do filesystem do servidor, evitando a
dependência e o custo de um serviço de objetos.

## Decisão

Usar o **storage local do Django** (`MEDIA_ROOT` / `backend/media/`) para upload e geração de
arquivos, com servidor de arquivos pelo backend/Nginx em produção.

## Alternativas consideradas

- **S3/MinIO (proposta original do RFC)** — adiado. Recomendado quando houver necessidade de
  escala horizontal (múltiplas instâncias sem disco compartilhado) ou retenção/distribuição de
  arquivos em larga escala.

## Consequências

- Menos dependências e configuração; adequado a um deploy single-VPS.
- Backups do volume cobrem os artefatos junto com o restante.
- Ponto de atenção: Acoplamento ao disco do servidor dificulta escalar horizontalmente — aceitável no MVP.
- Ponto de atenção: **Desvio em relação ao RFC** — registrado para a banca; migrar para S3 é evolução direta
  (basta trocar o storage backend do Django).


