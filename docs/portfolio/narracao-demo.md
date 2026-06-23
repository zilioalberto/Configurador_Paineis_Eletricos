# Narração para gravação da demo (teleprompter)

Texto para leitura ao vivo ou gravação de áudio da demonstração final. Ele acompanha o roteiro em [roteiro-demo.md](roteiro-demo.md) e usa o ambiente de produção validado em 2026-06-23.

Duração estimada: 8 a 10 minutos em ritmo natural.

## Bloco 1 - Abertura

Olá. Nesta demonstração apresento o Configurador de Painéis Elétricos, desenvolvido para o portfólio de Engenharia de Software conforme o RFC entregue à instituição.

O problema tratado é a elaboração de orçamentos de painéis customizados. Esse processo exige catálogo técnico, regras de dimensionamento, escolhas de componentes e revisão normativa. Quando tudo fica disperso em planilhas ou conhecimento informal, aumenta o risco de erro, retrabalho e perda de rastreabilidade.

A solução entregue é uma aplicação web no estilo CPQ, com autenticação, cadastro de projeto, cargas, dimensionamento, composição da lista de materiais e exportação da BoM em PDF e XLSX.

O escopo formal do portfólio é o fluxo do configurador. O repositório contém outros módulos em evolução, mas a avaliação deve se concentrar neste caminho crítico.

## Bloco 2 - Login

Agora acesso o portal publicado em produção: https://portal.zfw.com.br.

O login usa autenticação JWT. A conta de demonstração é `demopac@zfw.com.br`, criada para que o avaliador consiga testar o sistema sem depender de ambiente local.

Depois do login, o sistema redireciona para a área autenticada. Isso atende ao requisito de controle de acesso: apenas usuários autenticados conseguem navegar pelo configurador, consultar projetos e manipular a composição de materiais.

## Bloco 3 - Projeto piloto

Nesta demo vou usar o projeto piloto `06001-26`, reproduzido no servidor remoto e registrado nas evidências da entrega.

A tela de configurações lista os projetos disponíveis. O projeto piloto foi criado com dados simples e controlados para demonstrar o fluxo de ponta a ponta: um painel com carga motor, dimensionamento calculado e composição de materiais.

A escolha por um projeto já preparado deixa a apresentação mais objetiva e permite que o avaliador compare a tela com os prints e metadados anexados à documentação.

## Bloco 4 - Cargas

Na etapa de cargas, o sistema mostra o que o painel deve alimentar.

Para o piloto, foi cadastrada a carga `M1`, representando um motor. Essa carga alimenta as regras de cálculo do projeto: corrente, condutores, proteção e, depois, a sugestão de componentes para a BoM.

Esse ponto cobre o requisito de cadastro de cargas do RFC e demonstra que o configurador trabalha com dados técnicos estruturados, não apenas com texto livre.

## Bloco 5 - Dimensionamento

Agora entro no dimensionamento.

O sistema calcula a corrente total do painel e apresenta os circuitos relacionados ao projeto. Na execução de produção, a corrente total registrada para o piloto foi de 1,55 ampere.

A revisão dos condutores foi confirmada antes da composição. Essa confirmação é importante porque impede que a BoM seja tratada como final sem passar pela etapa técnica de dimensionamento.

No escopo do MVP, as validações apoiam a revisão de engenharia e reduzem omissões. A responsabilidade normativa final continua documentada como revisão manual, especialmente para pontos ligados à IEC 61439.

## Bloco 6 - Composição e BoM

Na composição, o sistema usa o projeto, as cargas e o catálogo para gerar sugestões de materiais.

No projeto `06001-26`, a composição atual registra 6 itens aprovados na BoM, 1 sugestão aberta e 21 pendências abertas. Esses pontos estão documentados no relatório de conformidade como ressalvas de catálogo e composição.

Essa transparência é importante para a avaliação: o sistema não esconde ressalvas. Ele mostra o que foi aprovado, o que ficou pendente e quais evidências sustentam o resultado.

Aqui fica demonstrado o núcleo do configurador: transformar dados técnicos em uma lista de materiais rastreável, revisável e exportável.

## Bloco 7 - Exportação

Com a composição aprovada, mostro os arquivos exportados.

A entrega inclui a BoM do projeto piloto em PDF e XLSX: `composicao-06001-26.pdf` e `composicao-06001-26.xlsx`. Esses arquivos estão salvos em `docs/portfolio/evidencias-producao/exports`.

A exportação atende ao requisito do RFC de gerar saída utilizável pelo processo comercial e técnico, mesmo sem integração direta com ERP no escopo acadêmico.

## Bloco 8 - Evidências e documentação

Além da aplicação pública, a entrega final inclui repositório público, documentação de uso, RFC, rastreabilidade dos requisitos, evidências de testes, CI/CD, SonarCloud e monitoramento.

As evidências de produção estão organizadas em `docs/portfolio/evidencias-producao`: prints das telas, metadados do projeto, exports PDF/XLSX e resumo da execução.

O relatório de conformidade preenchido registra o ambiente, o usuário, o projeto piloto, os resultados da BoM e as ressalvas abertas. Isso permite que o avaliador compreenda a solução sem depender de contato posterior com o grupo.

## Bloco 9 - Encerramento

Para concluir: o projeto entrega um configurador web funcional em ambiente público, com autenticação, fluxo técnico de projeto, dimensionamento, composição de materiais, exportação e documentação de evidências.

A principal ressalva funcional do piloto é a pendências abertas da composição, mantida de forma explícita no relatório. Os demais itens essenciais para a avaliação estão reunidos no documento de entrega final.

Obrigado.

## Versão curta

Use se o tempo da apresentação for limitado.

1. Apresentar o problema: orçamento de painéis exige catálogo, regras e rastreabilidade.
2. Abrir o portal público e fazer login com `demopac@zfw.com.br`.
3. Mostrar o projeto piloto `06001-26`.
4. Mostrar a carga `M1`.
5. Mostrar dimensionamento e corrente total de 1,55 A.
6. Mostrar composição: 6 itens aprovados na BoM, 1 sugestão aberta e 21 pendências documentadas.
7. Mostrar exports PDF/XLSX.
8. Encerrar com evidências de produção, RFC, testes, CI/CD, SonarCloud e observabilidade.

## Dicas ao gravar

- Grave pelo portal público, não pelo ambiente local.
- Não leia UUID completo em voz alta; use o código do projeto `06001-26`.
- Se a aplicação oscilar, use os prints e exports em `evidencias-producao` como apoio.
- Deixe este arquivo aberto em uma segunda tela ou celular como teleprompter.

## Relacionados

- [roteiro-demo.md](roteiro-demo.md) - ações na tela
- [gravacao-demo.md](gravacao-demo.md) - preparação da gravação
- [evidencias-producao/README.md](evidencias-producao/README.md) - evidências capturadas no servidor remoto

