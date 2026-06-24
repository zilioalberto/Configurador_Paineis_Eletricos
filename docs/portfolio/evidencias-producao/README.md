# Evidências de produção - execução do roteiro

Data da atualização: 2026-06-23 21:53 BRT  
Ambiente: produção  
Portal: https://portal.zfw.com.br  
API: https://api.zfw.com.br/api/v1  
Usuário de demonstração: `demopac@zfw.com.br`  
Projeto piloto: `06001-26`  
UUID do projeto: `ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa`

Esta pasta registra a reprodução atualizada do roteiro de apresentação no servidor remoto, após a complementação do catálogo e reconfiguração do projeto **PAINEL PILOTO PORTFOLIO PRODUCAO 20260623-1151**.

As evidências (prints, exports e metadados) são geradas de forma reproduzível pelo script [`scripts/capturar-evidencias-producao.mjs`](../../../scripts/capturar-evidencias-producao.mjs), que lê o estado real do projeto pela API e captura as telas no portal.

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
| Itens aprovados na BoM | 29 |
| Sugestões abertas | 0 |
| Pendências abertas | 0 |
| Export XLSX | Gerado novamente |
| Export PDF | Gerado novamente |

Com o catálogo complementado, a composição foi fechada **sem pendências nem sugestões abertas**: todas as categorias auxiliares (cabos, terminais, identificação, canaleta, trilho DIN e kit de acessórios) passaram a ter item correspondente no catálogo e foram aprovadas na BoM.

## Itens da BoM

| Parte | Categoria | Código | Descrição | Qtd. |
|-------|-----------|--------|-----------|------|
| Proteção geral | Minidisjuntor | `5SJ13107MB` | DISJ 3P C 10A 5SJ1 310-7MB | 1,00 |
| Seccionamento | Seccionadora | `3LD30540TK53` | SECC. 3P 16A VM 3LD3054-0TK53 | 1,00 |
| Proteção de carga | Disjuntor Motor | `3MV81001MG00` | DISJUNTOR MOTOR 3MV8 1,0-1,6A 1NA+1NF | 1,00 |
| Acionamento de carga | Contatora | `3TS29100AN2` | CONTATOR AC3:6A 1NA 220VCA | 1,00 |
| Bornes | Borne | `1521850000` | CONECTOR DE PASSAGEM A2C 2.5 | 3,00 |
| Bornes | Borne | `1521680000` | CONECTOR DE PASSAGEM A2C 2.5 PE | 1,00 |
| Acessórios | Terminais | `TE.IS.AZ.0025.08` | TERMINAL TUBULAR SIMPLES AZUL 2,5 MM C8 | 6,00 |
| Acessórios | Cabo | `W0107-PT` | CABO FLEXÍVEL 750V 2,5MM² - PRETO | 1,05 |
| Acessórios | Cabo | `W0506-VD/AM` | CABO FLEXÍVEL 750V 1,5MM² - VERDE/AMARELO | 0,35 |
| Identificação | Identificação | `290` | SLZ 2/15 - suporte luva transparente 2,5 a 6,0 mm² | 3,00 |
| Acessórios | Cabo | `W0107-AZ` | CABO FLEXÍVEL 750V 2,5MM² - AZUL | 0,35 |
| Identificação | Identificação | `326` | SLZ 1/15 - suporte luva transparente 0,75 a 1,5 mm² | 3,00 |
| Acessórios | Terminais | `TE.IS.AZ.0025.08` | TERMINAL TUBULAR SIMPLES AZUL 2,5 MM C8 | 2,00 |
| Identificação | Identificação | `359` | ETA 7X15 - etiqueta para aparelhos | 1,00 |
| Identificação | Identificação | `290` | SLZ 2/15 - suporte luva transparente 2,5 a 6,0 mm² | 1,00 |
| Acessórios | Cabo | `W0507-VD/AM` | CABO FLEXÍVEL 750V 2,5MM² - VERDE/AMARELO | 0,35 |
| Identificação | Identificação | `326` | SLZ 1/15 - suporte luva transparente 0,75 a 1,5 mm² | 1,00 |
| Acessórios | Terminais | `TE.IS.AZ.0025.08` | TERMINAL TUBULAR SIMPLES AZUL 2,5 MM C8 | 2,00 |
| Acessórios | Cabo | `W0106-PT` | CABO FLEXÍVEL 750V 1,5MM² - PRETO | 1,05 |
| Identificação | Identificação | `359` | ETA 7X15 - etiqueta para aparelhos | 1,00 |
| Identificação | Identificação | `290` | SLZ 2/15 - suporte luva transparente 2,5 a 6,0 mm² | 1,00 |
| Identificação | Identificação | `359` | ETA 7X15 - etiqueta para aparelhos | 3,00 |
| Identificação | Identificação | `359` | ETA 7X15 - etiqueta para aparelhos | 3,00 |
| Acessórios | Terminais | `TE.IS.AZ.0025.08` | TERMINAL TUBULAR SIMPLES AZUL 2,5 MM C8 | 2,00 |
| Identificação | Identificação | `359` | ETA 7X15 - etiqueta para aparelhos | 1,00 |
| Acessórios | Terminais | `TE.IS.AZ.0025.08` | TERMINAL TUBULAR SIMPLES AZUL 2,5 MM C8 | 6,00 |
| Estrutura | Trilho DIN | `C038340.0000` | TRILHO TS35 X 7,5 AÇO S/FURO | 0,58 |
| Canaletas | Canaleta | `19270` | DND30030 660 - canaleta 30x30mm PVC rígido | 1,57 |
| Acessórios | Acessórios Gerais | `ZFW-KIT-PAINEL_PEQUENO` | KIT ACESSÓRIOS PAINEL PEQUENO | 1,00 |

> A lista acima reproduz os 29 itens da composição na ordem em que são gerados pelo configurador (itens de identificação, terminais e cabos aparecem por escopo/circuito). As descrições e quantidades exatas estão em [metadata-producao.json](metadata-producao.json) e nos exports.

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

Observação: a captura `09-composicao-final.png` registra a visão de composição final do projeto piloto, já com a BoM completa.

## Exports gerados

| Artefato | Arquivo | Tamanho aproximado |
|----------|---------|--------------------|
| BoM XLSX | [composicao-06001-26.xlsx](exports/composicao-06001-26.xlsx) | 9 KB |
| BoM PDF | [composicao-06001-26.pdf](exports/composicao-06001-26.pdf) | 13 KB |

## Arquivo de metadados

Os dados estruturados da execução atual estão em [metadata-producao.json](metadata-producao.json): projeto, carga, totais da composição, itens aprovados na BoM e caminhos dos exports. As listas de sugestões abertas e de pendências estão **vazias** nesta execução.
