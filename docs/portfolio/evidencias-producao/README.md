# Evidências de produção - execução do roteiro

Data da atualização: 2026-06-23 14:24 BRT  
Ambiente: produção  
Portal: https://portal.zfw.com.br  
API: https://api.zfw.com.br/api/v1  
Usuário de demonstração: `demopac@zfw.com.br`  
Projeto piloto: `06001-26`  
UUID do projeto: `ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa`

Esta pasta registra a reprodução atualizada do roteiro de demonstração no servidor remoto, após a complementação do catálogo e reconfiguração do projeto **PAINEL PILOTO PORTFOLIO PRODUCAO 20260623-1151**.

Antes desta atualização, os prints e exports antigos foram removidos. Os arquivos abaixo representam o estado atual do projeto em produção.

## Resumo da execução

| Item | Resultado |
|------|-----------|
| Login em produção | Validado |
| Healthcheck API | `{"status":"ok"}` |
| Projeto validado | `06001-26` - `PAINEL PILOTO PORTFOLIO PRODUCAO 20260623-1151` |
| Carga cadastrada | `M1` - motor bomba piloto |
| Corrente total calculada | 1,55 A |
| Circuitos de carga | 1 |
| Condutores confirmados | Sim |
| Itens aprovados na BoM | 6 |
| Sugestões abertas | 1 |
| Pendências abertas | 21 |
| Export XLSX | Gerado novamente |
| Export PDF | Gerado novamente |

A BoM atual está mais completa que a evidência anterior, com seis itens aprovados. Permanecem pendências abertas ligadas principalmente a acessórios, cabos, terminais e identificação. Para a apresentação, trate esses pontos como ressalvas documentadas do catálogo/escopo, não como falha escondida.

## Itens atuais da BoM

| Parte | Categoria | Código | Quantidade |
|-------|-----------|--------|------------|
| Proteção geral | Minidisjuntor | `5SJ13107MB` | 1,00 |
| Seccionamento | Seccionadora | `3LD30540TK53` | 1,00 |
| Proteção de carga | Disjuntor Motor | `3MV81001MG00` | 1,00 |
| Acionamento de carga | Contatora | `3TS29100AN2` | 1,00 |
| Bornes | Borne | `1521850000` | 3,00 |
| Bornes | Borne | `1521680000` | 1,00 |

## Ressalvas abertas

Resumo agrupado disponível em [metadata-producao.json](metadata-producao.json). As pendências atuais indicam lacunas de catálogo ou de aprovação para itens auxiliares, especialmente:

- cabos unipolares;
- terminais tubulares;
- etiquetas de identificação;
- suportes/luvas de cabo;
- sugestão aberta de canaleta.

## Capturas de tela

| Ordem | Tela | Arquivo |
|-------|------|---------|
| 1 | Login público | [01-login.png](screenshots/01-login.png) |
| 2 | Dashboard após login | [02-dashboard-pos-login.png](screenshots/02-dashboard-pos-login.png) |
| 3 | Lista de configurações/projetos | [03-configuracoes-lista.png](screenshots/03-configuracoes-lista.png) |
| 4 | Acesso ao projeto piloto | [04-projeto-detalhe.png](screenshots/04-projeto-detalhe.png) |
| 5 | Fluxo - cargas | [05-fluxo-cargas.png](screenshots/05-fluxo-cargas.png) |
| 6 | Cargas do projeto | [06-cargas-projeto.png](screenshots/06-cargas-projeto.png) |
| 7 | Fluxo - dimensionamento | [07-fluxo-dimensionamento.png](screenshots/07-fluxo-dimensionamento.png) |
| 8 | Composição do painel | [08-composicao.png](screenshots/08-composicao.png) |
| 9 | Composição final / visão completa | [09-composicao-final.png](screenshots/09-composicao-final.png) |

Observação: a captura atual registra diretamente a visão de composição final do projeto piloto.

## Exports gerados

| Artefato | Arquivo | Tamanho aproximado |
|----------|---------|--------------------|
| BoM XLSX | [composicao-06001-26.xlsx](exports/composicao-06001-26.xlsx) | 9 KB |
| BoM PDF | [composicao-06001-26.pdf](exports/composicao-06001-26.pdf) | 10 KB |

## Arquivo de metadados

Os dados estruturados da execução atual foram salvos em [metadata-producao.json](metadata-producao.json). Esse arquivo registra projeto, carga, totais da composição, itens aprovados na BoM, sugestão aberta, resumo de pendências e caminhos dos exports.

