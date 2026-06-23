# Roteiro de demo - Portfólio (M7)

Roteiro para apresentação ou gravação da entrega final. Esta versão considera o ambiente de produção já publicado e validado em 2026-06-23.

- Portal: https://portal.zfw.com.br
- API: https://api.zfw.com.br/api/v1
- Usuário de demonstração: `demopac@zfw.com.br`
- Senha: `DemoPac2026!`
- Projeto piloto validado: `06001-26`
- UUID do projeto: `ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa`
- Evidências: [evidencias-producao/README.md](evidencias-producao/README.md)
- Relatório de conformidade: [relatorio-conformidade-PRJ-PILOTO-01.md](exemplos/relatorio-conformidade-PRJ-PILOTO-01.md)

## 1. Objetivo da demonstração

Mostrar o fluxo principal do MVP descrito no RFC: login, acesso ao configurador, projeto piloto, cargas, dimensionamento, composição, BoM e exportação PDF/XLSX.

A execução em produção já foi registrada com prints e arquivos exportados. Durante a apresentação, é possível usar o projeto `06001-26` para demonstrar o fluxo sem recriar dados do zero.

## 2. Antes de apresentar

1. Abrir https://portal.zfw.com.br/login.
2. Entrar com `demopac@zfw.com.br` / `DemoPac2026!`.
3. Confirmar que o projeto `06001-26` aparece na lista de configurações.
4. Abrir a pasta [evidencias-producao](evidencias-producao/README.md) para ter prints e exports como apoio.
5. Conferir os arquivos:
   - [composicao-06001-26.xlsx](evidencias-producao/exports/composicao-06001-26.xlsx)
   - [composicao-06001-26.pdf](evidencias-producao/exports/composicao-06001-26.pdf)

## 3. Roteiro na interface

### 3.1 Login - RF-01

| Passo | Ação |
|-------|------|
| 1 | Abrir https://portal.zfw.com.br/login |
| 2 | Entrar com a conta de demonstração |
| 3 | Mostrar que o sistema redireciona para a área autenticada |

Fala sugerida: “O acesso é protegido por autenticação JWT. A conta de demonstração permite que o avaliador percorra o fluxo sem depender de ambiente local.”

### 3.2 Lista de configurações / projeto piloto

| Passo | Ação |
|-------|------|
| 1 | Abrir `/configurador/configuracoes` |
| 2 | Localizar o projeto `06001-26` |
| 3 | Mostrar nome, código e contexto do projeto piloto |

Evidência correspondente: [03-configuracoes-lista.png](evidencias-producao/screenshots/03-configuracoes-lista.png).

### 3.3 Cargas - RF-04

| Passo | Ação |
|-------|------|
| 1 | Abrir `/configurador/cargas?projeto=ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa` |
| 2 | Mostrar a carga `M1` cadastrada |
| 3 | Explicar que a carga alimenta o dimensionamento elétrico e a composição de materiais |

Evidências:

- [05-fluxo-cargas.png](evidencias-producao/screenshots/05-fluxo-cargas.png)
- [06-cargas-projeto.png](evidencias-producao/screenshots/06-cargas-projeto.png)

### 3.4 Dimensionamento - RF-05

| Passo | Ação |
|-------|------|
| 1 | Abrir `/configurador/configuracoes/ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa/fluxo/dimensionamento` |
| 2 | Mostrar o cálculo do projeto piloto |
| 3 | Mencionar corrente total registrada: 1,55 A |
| 4 | Mencionar que a revisão dos condutores foi confirmada |

Evidência correspondente: [07-fluxo-dimensionamento.png](evidencias-producao/screenshots/07-fluxo-dimensionamento.png).

### 3.5 Composição e BoM - RF-06 / RF-07

| Passo | Ação |
|-------|------|
| 1 | Abrir `/configurador/composicao?projeto=ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa` |
| 2 | Mostrar os itens aprovados na BoM |
| 3 | Explicar que as sugestões foram geradas a partir das regras e do catálogo |
| 4 | Mencionar as ressalvas: existem 21 pendências abertas e 1 sugestão ainda pendente no catálogo/composição |

Totais da execução em produção:

| Métrica | Valor |
|---------|-------|
| Sugestões abertas | 1 |
| Sugestões aprovadas / itens incorporados | 6 |
| Itens aprovados na BoM | 6 |
| Pendências abertas | 21 |

Evidência correspondente: [08-composicao.png](evidencias-producao/screenshots/08-composicao.png).

### 3.6 Exportação - RF-08

| Passo | Ação |
|-------|------|
| 1 | Mostrar que o projeto possui export PDF/XLSX gerado |
| 2 | Abrir os arquivos salvos como evidência |
| 3 | Relacionar o export ao requisito de BoM do RFC |

Arquivos:

- [composicao-06001-26.xlsx](evidencias-producao/exports/composicao-06001-26.xlsx)
- [composicao-06001-26.pdf](evidencias-producao/exports/composicao-06001-26.pdf)

### 3.7 Relatório de conformidade - RNF-15

Abrir [relatorio-conformidade-PRJ-PILOTO-01.md](exemplos/relatorio-conformidade-PRJ-PILOTO-01.md) e destacar:

- ambiente de produção;
- projeto `06001-26`;
- usuário `demopac@zfw.com.br`;
- validações automáticas;
- ressalvas abertas de catálogo/composição e revisão manual IEC 61439.

## 4. Fala de encerramento

“O roteiro foi reproduzido no servidor remoto em 2026-06-23. A entrega inclui aplicação pública, usuário de demonstração, evidências de tela, metadados do projeto, BoM exportada em PDF/XLSX, documentação técnica, CI/CD, SonarCloud e observabilidade. As ressalvas funcionais registradas no piloto são as pendências abertas de catálogo/composição, documentadas no relatório de conformidade.”

## 5. Plano B

Se a aplicação estiver instável durante a banca, usar as evidências já capturadas:

- prints em [evidencias-producao/screenshots](evidencias-producao/screenshots/);
- metadados em [metadata-producao.json](evidencias-producao/metadata-producao.json);
- exports em [evidencias-producao/exports](evidencias-producao/exports/).

O script `scripts/validar-demo-api.ps1` continua disponível para validação local ou técnica, mas a evidência principal da entrega é a execução em produção registrada nesta documentação.

