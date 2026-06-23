# ADR 0006 — Integração SEFAZ nativa com certificado A1

- **Status:** Aceito
- **Data:** 2026
- **Relacionado:** módulo `fiscal` (evolução de produto, ver [ADR 0007](0007-escopo-portfolio-cpq.md))

## Contexto

O módulo fiscal (evolução de produto, fora do MVP do RFC) precisa sincronizar documentos
fiscais com a SEFAZ (DistDFe/NSU, consulta por chave, manifestação). Inicialmente cogitou-se uma
**"ponte" com ACBrMonitor e certificado A3** (token físico) executada por um agente externo.
Essa abordagem exigia um processo Windows dedicado, autenticação por token de agente e
hardware (A3), aumentando a superfície de operação e de segurança.

## Decisão

Implementar a integração SEFAZ **nativamente em Python**, com **certificado A1** (arquivo):

- Assinatura XML-DSig com `signxml` + `cryptography`.
- Cliente SOAP/DistDFe próprio (`services/sefaz/`), sem ACBr.
- Autenticação do portal exclusivamente por **JWT** (o token de agente foi removido).

O caminho legado (ponte A3 / ACBr / agente) foi **eliminado** do código, configuração, testes e
documentação.

## Alternativas consideradas

- **Ponte ACBrMonitor + A3 (abordagem inicial)** — descartada: dependência de processo externo,
  hardware A3 e autenticação adicional; maior custo operacional e de segurança.

## Consequências

- ✅ Operação 100% no backend, sem agente externo nem hardware dedicado.
- ✅ Menos superfície de autenticação (somente JWT).
- ✅ Base de código mais simples e testável.
- ⚠️ O certificado A1 deve ser protegido (variáveis de ambiente / segredos), nunca versionado.
