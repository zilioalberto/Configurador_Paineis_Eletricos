# Narração para gravação da demo (teleprompter)

Textos para ler **ao vivo** ou gravar áudio depois. Siga a tela em [roteiro-demo.md](roteiro-demo.md). Duração total: **cerca de 9 a 11 minutos** em ritmo natural.

---

## Bloco 1 — Abertura (~40 s)

Olá. Nesta demonstração apresento o **Módulo de Auxílio à Escolha de Materiais para Orçamentos de Painéis Elétricos**, desenvolvido no âmbito do portfólio de Engenharia de Software, conforme o RFC entregue à instituição.

O problema que atacamos é a elaboração de orçamentos de painéis customizados: são dezenas ou centenas de componentes, muitas regras técnicas e forte dependência de conhecimento tácito dos orçamentistas seniores.

A solução do MVP é uma aplicação web no estilo **CPQ** — Configure, Price, Quote — com **catálogo estruturado**, **assistente passo a passo**, **validações normativas** e geração da **lista de materiais**, a BoM, com exportação em PDF e planilha.

Deixo claro: o repositório evolui como um ERP modular, mas **o escopo formal do portfólio é este wizard de configuração**, não os demais módulos que aparecem no menu.

---

## Bloco 2 — Login (~45 s)

Agora acesso o sistema em ambiente local.

O login usa **autenticação JWT**: o usuário informa e-mail e senha, recebe um token e só então acessa projetos, dimensionamento e composição.

Isso atende ao requisito de segurança do RFC: controle de acesso e perfis. Utilizadores não autenticados não manipulam propostas nem listas de materiais.

*(Digite e-mail e senha; entre no sistema.)*

---

## Bloco 3 — Novo projeto (~1 min 30 s)

Vou criar um **novo projeto**. No RFC, o projeto representa a **proposta de engenharia** em elaboração — equivalente a um rascunho comercial-técnico.

Clico em **Projetos**, depois **Novo**. Posso **alocar um código** automático no padrão da empresa, por exemplo zero cinco zero zero um traço vinte e seis.

Defino um nome claro: **Painel piloto — bombeamento**. Informo o cliente, a tensão nominal **trezentos e oitenta volts**, sistema **trifásico**, **sessenta hertz**.

Para alimentação, neutro e terra, escolho conexão por **borne**, coerente com painéis de campo.

Recursos opcionais — PLC, climatização, seccionadora — deixo desmarcados neste piloto para focar no fluxo principal.

Salvo. O projeto fica registrado e passa a ser a âncora de todas as etapas seguintes.

---

## Bloco 4 — Wizard: visão geral (~1 min)

Abro o **fluxo guiado do projeto** — o coração do entregável do portfólio.

No RFC, o assistente percorre conceitualmente: alimentação, proteção, comandos, invólucro e acessórios. Na nossa implementação, organizamos em quatro etapas práticas: **dados do projeto**, **cargas**, **dimensionamento de condutores** e **composição do painel**.

À direita — ou na mesma tela — há um **checklist** que indica o que já está pronto e o que ainda bloqueia a exportação. Isso orienta o orçamentista menos experiente e reduz omissões.

---

## Bloco 5 — Cargas (~2 min)

Na etapa **Cargas**, cadastro o que o painel vai alimentar.

Crio, por exemplo, o motor **M um**: tag M um, descrição bomba, potência de **um cavalo-vapor**, tensão do motor compatível com o projeto.

Cada carga alimenta o motor de cálculo: correntes, proteções e, depois, a lista de materiais.

Posso incluir outras cargas — segundo motor, alimentação geral, resistências — conforme o caso. O importante para a demo é ter **pelo menos uma carga** para liberar o dimensionamento.

Volto ao wizard: o checklist marca **cargas cadastradas**.

---

## Bloco 6 — Dimensionamento (~2 min 30 s)

Entro no **dimensionamento de condutores**.

O sistema recalcula com base nas cargas e nas regras implementadas, alinhadas à **ABNT NBR 5410** no escopo do MVP — por exemplo corrente de projeto, seções comerciais de condutores, condutor de proteção e validações de escolha.

Veja a corrente calculada por circuito e as **bitolas sugeridas**. Se necessário, o engenheiro pode ajustar dentro das opções válidas; combinações inválidas são **bloqueadas ou sinalizadas**, reduzindo retrabalho.

Antes de seguir, **confirmo a revisão das bitolas** no wizard. Isso é deliberado: ninguém exporta uma BoM sem ter passado pela etapa normativa de condutores.

No checklist, dimensionamento e confirmação aparecem como concluídos.

---

## Bloco 7 — Composição e sugestões (~2 min 30 s)

Na **composição do painel**, o sistema usa o dimensionamento e o **catálogo técnico** para **sugerir materiais**: disjuntores, contatores, bornes e demais itens compatíveis.

Clico em **gerar sugestões**. O motor de regras propõe itens; onde há bloqueio, existem **alternativas** — requisito RF seis do RFC.

Reviso cada linha: **aprovo** a sugestão aceitável ou troco por outro produto do catálogo. Também posso fazer **inclusão manual** de um item que não entrou na sugestão automática.

Enquanto houver **pendências**, o checklist avisa. Para a demonstração, o ideal é aprovar o essencial e deixar a BoM coerente.

Aqui nasce a **lista de materiais** — a BoM — que alimenta o orçamento.

---

## Bloco 8 — Exportação (~1 min 15 s)

Com a composição revisada, **exporto** a lista.

O MVP entrega **planilha Excel** e **PDF**, conforme o RFC. Os arquivos saem com identificação do projeto para envio ao cliente ou para importação futura — sem integração ERP no escopo acadêmico, apenas exportação.

Abro rapidamente o PDF ou a planilha para mostrar códigos, descrições e quantidades.

---

## Bloco 9 — Histórico e encerramento (~1 min)

No wizard, o card de **histórico** mostra eventos: criação do projeto, recálculo de dimensionamento, geração de composição — com **rastreabilidade** de quem fez o quê.

Isso apoia o **relatório de conformidade** previsto no RFC: o que foi validado automaticamente pela NBR 5410, o que fica para revisão manual — por exemplo partes da IEC 61439 — e as lacunas documentadas.

Para encerrar: entregamos um **wizard navegável** que orienta, valida e padroniza a composição de painéis; o repositório tem **testes automatizados** no caminho crítico e documentação alinhada ao RFC.

O próximo passo de produção é **deploy público** e medição das metas de desempenho — latência e disponibilidade — definidas no documento.

Obrigado.

---

## Versão curta (~6 min)

Use se o professor limitar tempo.

1. **Abertura:** Módulo CPQ para orçamento de painéis — wizard, validações NBR 5410, BoM. Escopo do portfólio é só isso; ERP é evolução.

2. **Login:** JWT, acesso controlado.

3. **Projeto:** Nova proposta — código, nome, 380 V trifásico, bornes.

4. **Wizard:** Quatro etapas — projeto, cargas, dimensionamento, composição — com checklist.

5. **Cargas:** Motor M1, um CV.

6. **Dimensionamento:** Cálculo e confirmação de bitolas; regras bloqueiam escolhas inválidas.

7. **Composição:** Gerar sugestões, aprovar, BoM.

8. **Export:** PDF e XLSX.

9. **Fim:** Histórico, conformidade, testes CI.

---

## Dicas ao gravar

- Fale **um pouco mais devagar** que o normal; pausas de um segundo após cada clique ajudam quem assiste.
- **Não leia** códigos UUID em voz alta; diga só “projeto criado” ou o código `05001-26`.
- Se travar na tela, use a frase: “Enquanto o sistema recalcula, vale notar que…” e mostre o checklist.
- Coloque este arquivo numa **segunda tela** ou celular como teleprompter.

---

## Relacionados

- [roteiro-demo.md](roteiro-demo.md) — ações na tela  
- [gravacao-demo.md](gravacao-demo.md) — como gravar no Windows  
- [scripts/validar-demo-api.ps1](../../scripts/validar-demo-api.ps1) — validação técnica antes da gravação (não aparece no vídeo)
