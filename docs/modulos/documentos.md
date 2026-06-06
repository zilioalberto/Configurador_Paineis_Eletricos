# Documentos

## Objetivo

Templates, PDFs gerados, anexos e documentos por entidade.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Parcial** — `apps.documentos` |
| Frontend | *A documentar* |

**ID ERP:** `documentos` · **Área:** Transversal

## A documentar

- [ ] Models e API atuais
- [ ] Geração de PDF por projeto/orçamento
- [ ] Templates de oferta com blocos ricos, textos explicativos e imagens
- [ ] Biblioteca de anexos reutilizáveis por cliente, produto ou seção

## Papel no fluxo de oferta

O módulo de documentos deve concentrar a **apresentação** da oferta, enquanto o módulo de orçamentos concentra o **cálculo**.

Fluxo sugerido:

1. O usuário monta o orçamento em `apps.orcamentos`.
2. Escolhe o perfil de oferta no envio: detalhada ou materiais.
3. O gerador busca um template em `apps.documentos`.
4. O template compõe seções textuais, tabelas e imagens.
5. O resultado intermediário é exportado em DOCX para revisão comercial, renderizado a partir de um template Word (`docxtpl`) para preservar logo, imagens, estilos, cabeçalho e rodapé.
6. O DOCX revisado é convertido em PDF final e referenciado pelo snapshot da proposta.

Regras para os blocos de documento:

- Texto rico deve permitir títulos, parágrafos, listas e observações.
- Imagens devem ter legenda opcional e posição definida no template.
- O mesmo orçamento pode gerar mais de um layout, sem duplicar a lógica de cálculo.
- O snapshot precisa registrar qual template foi usado para reproduzir exatamente o documento enviado.

**Registry:** `backend/config/erp_registry.py` → `documentos`
