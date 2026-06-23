# ADR 0004 — Geração de documentos síncrona (sem Celery/Redis no MVP)

- **Status:** Aceito (desvio consciente do RFC)
- **Data:** 2025
- **Relacionado:** RFC §3.2.2, §3.2.6 (item 4), RF-08

## Contexto

O RFC previu geração de PDF **assíncrona** com **Celery + Redis** para evitar timeouts em BoMs
grandes. Na prática, o volume de documentos do caminho crítico (propostas/ofertas em PDF e DOCX)
é processado em tempo aceitável de forma síncrona, e introduzir broker + workers adicionaria
infraestrutura e pontos de falha significativos para o MVP.

## Decisão

Gerar documentos de forma **síncrona** na requisição:

- **PDF/HTML:** WeasyPrint.
- **DOCX:** docxtpl.
- **Planilhas:** openpyxl.
- **PDF técnico/listas:** ReportLab.

Não há Celery nem Redis no projeto.

## Alternativas consideradas

- **Celery + Redis (proposta original do RFC)** — adiado. Vale a pena apenas quando o tamanho
  dos documentos ou a concorrência justificar; é uma evolução natural e está documentado como
  tal.

## Consequências

- Infraestrutura mais simples (menos serviços no Compose), adequada ao MVP.
- Menos pontos de falha; deploy e operação mais fáceis.
- Ponto de atenção: Documentos muito grandes podem aproximar o limite de tempo de requisição — aceitável no
  escopo atual (BoM/proposta de tamanho típico).
- Ponto de atenção: **Desvio em relação ao RFC** — registrado explicitamente para a banca; o RFC já listava o
  modo síncrono como alternativa considerada.


