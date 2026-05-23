# Backlog (documentação e produto)

Itens anotados para evolução futura da documentação e do sistema.

> Priorize itens que atendam ao [escopo do portfólio](visao-geral/escopo-portfolio.md) (wizard em `configurador_paineis`) antes de expandir módulos ERP fora do RFC.

## Documentação — portfólio

- [x] **RFC** em `docs/rfc.pdf` + resumo em [portfolio/rfc.md](portfolio/rfc.md)
- [x] Rastreabilidade RF/RNF — [rastreabilidade-requisitos.md](portfolio/rastreabilidade-requisitos.md)
- [x] Checklist de testes — [checklist-testes.md](checklist-testes.md)
- [x] Rastreabilidade com arquivos e rotas — [rastreabilidade-requisitos.md](portfolio/rastreabilidade-requisitos.md)
- [x] Modelo relatório de conformidade — [relatorio-conformidade.md](portfolio/relatorio-conformidade.md)
- [x] Script API validado — `scripts/validar-demo-api.ps1` (Docker 2026-05-23)
- [ ] RF-03: snapshot versionado catálogo+regras no cabeçalho do export
- [ ] Endpoint PDF automático do relatório de conformidade (evolução RNF-15)
- [ ] Política de privacidade (LGPD) linkada no sistema

## Produto

- **Quadro de horas por colaborador/dia** — visão para gestores avaliarem quanto cada colaborador trabalhou em cada dia (relacionado ao módulo [tarefas](modulos/tarefas.md) / relatório de horas).

## Documentação

- [ ] Mapa completo de rotas da API
- [ ] Referências normativas no [glossário](visao-geral/glossario.md)
- [ ] Guia de deploy em produção
- [ ] OpenAPI / Swagger gerado a partir do DRF
- [ ] Consolidar notas antigas de `wdocs/` e `w1docs/` (pastas legadas na raiz)

## Migração de pastas legadas

| Pasta antiga | Ação sugerida |
|--------------|----------------|
| `wdocs/` | Conteúdo migrado para este arquivo e docs de módulos; pasta pode ser removida após revisão |
| `w1docs/` | Vazia; remover ou usar apenas como atalho para `docs/` |
