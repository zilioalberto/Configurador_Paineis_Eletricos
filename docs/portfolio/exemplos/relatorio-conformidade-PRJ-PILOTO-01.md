# Relatório de conformidade - PRJ-PILOTO-01

Exemplo preenchido para a entrega do portfólio. Este relatório usa a execução realizada no ambiente de produção em 2026-06-23, com evidências salvas em [evidencias-producao](../evidencias-producao/README.md).

---

## Identificação

| Campo | Valor |
|-------|-------|
| Projeto / proposta | **PRJ-PILOTO-01** (`06001-26`) |
| Cliente | Cliente piloto portfolio |
| Data da execução | 2026-06-23 |
| Responsável técnico | A preencher na revisão final |
| Versão do sistema | commit `509d2c8` / branch `resolve-dev-main-pr` no momento da validação em produção |
| Usuário que configurou | `demopac@zfw.com.br` |
| Ambiente | Produção - `https://portal.zfw.com.br` |
| UUID projeto validado | `ffd2df39-6c05-4c69-9f22-bfea9ef5f4fa` |

---

## 1. Escopo normativo (RFC § 2.8)

### 1.1 Validação automática no MVP

| Norma | Cobertura neste piloto | Evidência |
|-------|------------------------|-----------|
| **NR-10** | Checklist essencial no fluxo de dimensionamento/composição | Wizard exige revisão de condutores antes da composição final |
| **ABNT NBR 5410** | Dimensionamento de condutores, corrente de projeto, seção comercial, neutro e PE | Serviços de dimensionamento e testes `test_validar_escolhas*.py` |

### 1.2 Documentadas - verificação manual

| Norma | Status neste piloto | Observação |
|-------|---------------------|------------|
| **ABNT NBR 5419** (SPDA) | Não aplicável ao piloto | Cenário de painel indoor em ambiente controlado |
| **ABNT NBR IEC 61439** | Pendente revisão manual | Coordenação e verificação do conjunto devem ser revisadas por responsável técnico |

### 1.3 Lacunas conhecidas

- Simulação térmica/CAE detalhada não faz parte do MVP.
- Snapshot global imutável de catálogo/regras permanece como evolução de RF-03.
- Integração direta com ERP/CRM não faz parte do escopo do MVP; o fluxo entrega exportação XLSX/PDF.

---

## 2. Resumo da configuração

Cenário de painel BT trifásico 380 V, alimentação com neutro/terra em bornes e uma carga motor piloto.

| Item | Valor |
|------|-------|
| Nome do projeto | `PAINEL PILOTO PORTFOLIO PRODUCAO 20260623-1151` |
| Código | `06001-26` |
| Tensão nominal | 380 V, trifásico, 60 Hz |
| Número de cargas | 1 motor (`M1`) |
| Corrente total do painel | 1,55 A |
| Dimensionamento recalculado | Sim |
| Condutores confirmados | Sim |
| Sugestões abertas | 1 |
| Sugestões aprovadas / itens incorporados | 6 |
| Itens aprovados na BoM | 6 |
| Pendências abertas | 21 |

Totais atuais registrados em `metadata-producao.json` após a complementação do catálogo e reconfiguração do piloto:

```json
{
  "sugestoes": 1,
  "pendencias": 21,
  "composicao_itens": 6,
  "inclusoes_manuais": 0
}
```

---

## 3. Validações executadas (RF-05)

| Carga / circuito | Regra | Resultado | Referência |
|------------------|-------|-----------|------------|
| Alimentação geral | Corrente de projeto e condutores mínimos | Validado | NBR 5410 - dimensionamento básico |
| Alimentação geral | Neutro e PE em seção comercial | Validado | Serviços de validação de condutores |
| Motor M1 | Cálculo de corrente e circuito de carga | Validado | Dimensionamento retornou 1 circuito de carga |
| Condutores | Confirmação de revisão no fluxo | Confirmado | `condutores_revisao_confirmada = true` |

---

## 4. Sugestões e decisões (RF-06 / auditoria)

| Ordem | Ação | Usuário / origem | Detalhe |
|-------|------|------------------|---------|
| 1 | Projeto criado | `demopac@zfw.com.br` | Código `06001-26` |
| 2 | Carga cadastrada | `demopac@zfw.com.br` | Motor `M1` |
| 3 | Dimensionamento recalculado | Sistema | Corrente total 1,55 A |
| 4 | Condutores confirmados | `demopac@zfw.com.br` | Revisão confirmada via API/fluxo |
| 5 | Composição reavaliada | Sistema | 1 sugestão permanece aberta após a reconfiguração |
| 6 | Itens aprovados | `demopac@zfw.com.br` | 6 itens consolidados na BoM |
| 7 | Ressalvas abertas | Sistema | 21 pendências permanecem documentadas para revisão de catálogo/composição |

---

## 5. BoM e exportações (RF-07 / RF-08)

| Artefato | Gerado? | Evidência |
|----------|---------|-----------|
| Snapshot BoM | Sim | `metadata-producao.json` e tela de composição |
| Export XLSX | Sim | [composicao-06001-26.xlsx](../evidencias-producao/exports/composicao-06001-26.xlsx) |
| Export PDF | Sim | [composicao-06001-26.pdf](../evidencias-producao/exports/composicao-06001-26.pdf) |
| Prints do fluxo | Sim | [evidencias-producao/README.md](../evidencias-producao/README.md) |

Conferência do export:

- Código e descrição dos componentes: presente no export.
- Quantidades: presente no export.
- Identificação do projeto: presente no nome dos arquivos gerados.
- Versão catálogo/regras no cabeçalho: evolução pendente vinculada ao RF-03.

---

## 6. Conclusão

| Classificação | Apto com ressalvas |
|---------------|--------------------|
| Motivo | O fluxo principal foi executado em produção, com projeto, carga, dimensionamento, composição, 6 itens aprovados na BoM e exports atualizados. As ressalvas são as 21 pendências abertas indicadas pela composição e a revisão manual IEC 61439. |

**Assinatura / validação humana:** _________________________  
Declaro que revisei os itens de verificação manual e assumo responsabilidade técnica conforme NR-10.

---

## Evidências vinculadas

- [Evidências de produção](../evidencias-producao/README.md)
- [Roteiro de demo](../roteiro-demo.md)
- [Mapa da API do wizard](../mapa-api-wizard.md)
- [Checklist de testes](../../checklist-testes.md)

