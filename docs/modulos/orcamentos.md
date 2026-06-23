# Orçamentos

> **Portfólio:** apoio parcial a **RF-09** (propostas/custos); integração ERP completa **fora do RFC § 2.7**. Ver [rastreabilidade](../portfolio/rastreabilidade-requisitos.md).

## Objetivo

Propostas, versões, itens, margens, impostos e condições comerciais.

## Status

| Camada | Status |
|--------|--------|
| Backend | **Parcial** — `apps.orcamentos` |
| Frontend | **Parcial** — `src/modules/erp` (listagem/detalhe) |

**ID ERP:** `orcamentos` · **Área:** Comercial

## Backend

- **App:** `backend/apps/orcamentos/`
- **Models:** `Orcamento`, `OrcamentoItem` (expandir versões e impostos)

## Modelo de oferta

O orçamento deve continuar sendo o registro comercial base, mas a saída enviada ao cliente precisa ser parametrizada por **perfil de oferta**:

- **Detalhada**: escopo descritivo, seções textuais, imagens ilustrativas e investimento resumido em um item ou bloco final.
- **Materiais**: linhas com descrição e valores unitários visíveis para cada item.

Sugestão de dados no domínio de orçamentos:

- `Orcamento.perfil_oferta` com valores como `detalhada` e `materiais`.
- `Orcamento.descricao_escopo` para o texto-base do escopo comercial.
- `Orcamento.conteudo_oferta` opcional para rascunhos de seções ricas, quando o time comercial precisar ajustar o texto antes do envio.
- `OrcamentoSnapshot` guardando o perfil escolhido e a composição final renderizada, para manter rastreabilidade do documento enviado.

### Seções recomendadas para a oferta detalhada

- capa
- apresentação
- escopo de fornecimento
- premissas e exclusões
- investimento consolidado
- condições gerais
- anexos visuais / imagens técnicas

### Regra de apresentação

- A precificação continua sendo calculada em `OrcamentoItem`.
- A apresentação pode consolidar os itens em um resumo único, sem alterar o cálculo de origem.
- Imagens e textos ricos devem ser tratados como conteúdo editorial, não como parte da lógica de cálculo.

### Composição do preço (custo + margem + IPI)

O preço de venda **não fica no catálogo**. Ele é composto na linha do orçamento a partir do
**custo de referência** do item:

```
preco_unitario = custo_referencia × (1 + margem do cliente) × (1 + IPI)
```

- `custo_referencia` vem do catálogo (`Produto`/`Servico`) — ver [Catálogo › Custo de referência](catalogo.md#custo-de-referência-e-composição-do-preço). É atualizado pela NF-e de entrada, pelo cadastro ou pela revisão de preço na oferta.
- A **margem** é configurada por cliente (`/erp/orcamentos/margens-clientes`).
- O **IPI** vem do cadastro fiscal do produto (somente leitura na linha).
- `OrcamentoItem.custo_unitario` guarda o custo no momento da inclusão (rastreabilidade); `custo_atualizado_em` no catálogo alimenta o alerta de "Preço vencido".

## Frontend

- `OrcamentoListPage`, `OrcamentoDetailPage`
- Hooks de contatos do cliente

## Revisões e configurador

- `codigo_base` + `revisao` → exibição `Prop-MMNNN-AA Rev B`
- `POST /api/v1/erp/orcamentos/{id}/nova-revisao/` — comercial ou técnica (`paineis_reconfigurar`)
- `POST .../configuradores-painel/` — adiciona painel e cria `ProjetoConfigurador` no CPQ (cliente da proposta)
- `POST .../configuradores-painel/{vinculo_id}/sincronizar-composicao/` — importação manual da BoM

Tabela `erp_orcamento_configurador_painel` com `projeto_configurador_id` (db_column explícito).

## UI (detalhe da proposta)

- Margens de produtos/serviços no cabeçalho
- Busca de produtos do catálogo para linhas manuais
- **IPI %** exibido por linha (somente leitura; sempre do cadastro fiscal do produto)
- Painéis: adicionar, iniciar configurador (revisão técnica), sincronizar composição
- Nova revisão comercial/técnica (modal)
- **Margens por cliente:** `/erp/orcamentos/margens-clientes`
- Seletor de perfil de oferta: `MATERIAIS` ou `SOLUCAO_COMPLETA`
- Editor **documento único** (`OrcamentoOfertaDocumentoEditor`): um textarea contínuo; seções com `## Título` ou `1. Título` (índice lateral dinâmico); parser `ofertaDocumento.ts` → `oferta_blocos` para DOCX/prévia
- Formatação leve na prévia/impressão: parágrafos por linha em branco, listas com `- `, `**negrito**` (`OfertaConteudoFormatado`)
- Seção **Investimento** somente tabela de itens da proposta (texto `INVESTIMENTO` / `APROVACAO` não é editado nem enviado ao DOCX)
- **Desconto comercial** (opcional): flag + percentual na aba de linhas; resumo Subtotal / Desconto / Total na prévia (IPI já embutido nos preços das linhas). Exige permissão `orcamento.aplicar_desconto` (cadastro de usuários → permissões)
- **NCM no investimento**: perfil **Materiais** → NCM de cada produto no catálogo; **Solução completa** → campo manual na oferta (`ncm_investimento`, padrão `85371090` painel elétrico)
- **Descrição no investimento (solução completa)**: campo `investimento_descricao` na oferta; se vazio, usa «Demais itens da proposta» ou texto consolidado com o título da proposta
- Anexos DOCX/PDF opcionais em painel recolhível (fluxo principal: editar no portal → pré-visualizar → exportar DOCX)
- **Enviar ao cliente:** `POST /orcamentos/{id}/enviar-oferta-cliente/` — gera PDF, snapshot, convite público e registra envio; e-mail opcional (`EMAIL_*` no `.env`)
- **Link público:** `/oferta-publica/{token}` (frontend) · API `GET/POST /api/v1/oferta-publica/{token}/` (visualizar, aprovar/recusar, anexar PDF assinado)
- **Notificação interna:** ao aprovar/recusar, alerta no sino do portal para a equipe da proposta (`apps.notificacoes`)

### Oferta — três fases (implementadas)

| Fase | Escopo |
|------|--------|
| **1 — Backend** | `oferta_texto.py`, `oferta_secoes.py`, `oferta_documento.py` (editor único), `docx_oferta.py` com template **`zfw_proposta_template_v8.docx`** (campos por seção + estilos ZFW) |
| **2 — Editor** | Documento único flexível (`ofertaDocumento.ts`); títulos reconhecidos alimentam campos do template DOCX; seções extras → Observações |
| **3 — Prévia** | `ofertaConteudoFormatado.tsx` na modal, impressão e exportação (sem prévia ao vivo na tela de edição) |

Backend: `pytest apps/orcamentos/tests/test_oferta_texto.py` e testes de API com filtro `oferta`.

### Modelo de proposta para o cliente (Fase A)

- **Saída principal:** página `/orcamentos/{id}/oferta` — layout fluido (`PropostaClienteDocument`), impressão/PDF pelo navegador.
- Botão na proposta: **Proposta para o cliente**; DOCX renomeado como **Exportar DOCX (revisão)**.
- Conteúdo comercial: blocos editáveis (`##` no portal → `oferta_blocos` → prévia).
- **Apêndice legal:** `oferta_termos_legais.py` (versão `2026.1`), recolhível na tela e expandido na impressão.
- Componentes: `PropostaClienteDocument.tsx`, `propostaClienteUi.ts`, `PropostaClienteDocument.css`.

### Exportação DOCX (revisão interna)

- Template **`zfw_proposta_template_v8.docx`** — campos por seção (layout ZFW clássico).
- Mapeamento `oferta_blocos` → placeholders Word na exportação.

## A documentar

- [ ] Horas de dimensionamento na composição → linha de serviço na proposta (futuro)
- [x] Renomear `Projeto` → `ProjetoConfigurador` no CPQ (`configurador_projeto`)
- [x] Implementar `perfil_oferta` e prévia estruturada da oferta
- [x] Gerar DOCX editável da oferta para revisão comercial
- [ ] Converter DOCX revisado em PDF final e vincular ao snapshot

## Testes

```bash
pytest backend/apps/orcamentos -q
```
