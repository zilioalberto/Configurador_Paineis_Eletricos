# ADR 0007 — Escopo do portfólio limitado ao CPQ/configurador

- **Status:** Aceito
- **Data:** 2025–2026
- **Relacionado:** RFC §2 (Descrição), `docs/visao-geral/escopo-portfolio.md`, linha de projeto Web Apps

## Contexto

O repositório é um **monorepo** que evoluiu para além do MVP do RFC: além do núcleo CPQ
(configurador de painéis), há um módulo fiscal funcional e diversos apps de roadmap ERP. A linha
de projeto Web Apps do portfólio:

1. exige que as funcionalidades estejam **conforme o escopo definido no RFC**; e
2. **proíbe** explicitamente os temas *"sistema de gestão financeira"* e *"sistema de controle
   de estoque"*.

É preciso evitar que a avaliação interprete módulos de evolução (fiscal/financeiro/estoque) como
o produto entregue — o que poderia ser lido como desvio de escopo ou aproximação de tema
impedido.

## Decisão

Definir e comunicar de forma inequívoca que o **entregável acadêmico é o módulo CPQ/configurador
de painéis** (`configurador_paineis`) + suporte de `catalogo` e `accounts`:

- Wizard (RF-04) → cargas → dimensionamento (RF-05) → composição/BoM (RF-07) → proposta (RF-09).
- README, `escopo-portfolio.md` e a documentação destacam o recorte do RFC.
- **A apresentação final foca exclusivamente no fluxo CPQ.** Os módulos fiscal/ERP **não** são
  apresentados como produto.

Garantias técnicas que sustentam o recorte:

- Os apps `financeiro`, `estoque`, `crm`, `compras`, `producao`, `qualidade`, `conformidade`,
  `expedicao`, `pos_venda`, `documentos`, `auditoria`, `integracoes`, `relatorios`,
  `pedidos_venda` são **stubs de roadmap sem API ativa** (não roteados em `config/urls.py`).
- O módulo `fiscal` é funcional, porém **rotulado como evolução de produto**, fora do MVP do RFC.

## Alternativas consideradas

- **Apresentar o ERP completo** — descartado: dilui a narrativa, foge do RFC e encosta em temas
  impedidos.
- **Remover os módulos de evolução do repositório** — descartado: têm valor para a empresa
  parceira; a separação por documentação e ausência de API ativa é suficiente para isolar o
  escopo acadêmico.

## Consequências

- Narrativa de avaliação alinhada ao RFC e à linha de projeto.
- Risco de "tema impedido" neutralizado: estoque/financeiro são inertes; fiscal é roadmap.
- Ponto de atenção: Exige manter a disciplina de só demonstrar o CPQ na apresentação final.


