# Relatório de conformidade — PRJ-PILOTO-01

> **Exemplo preenchido** para demo e entrega do portfólio (PAC). Cenário alinhado ao fluxo do wizard e aos testes automatizados do repositório.  
> Substituir identificadores e datas após percorrer o fluxo no ambiente local ou deploy.

---

## Identificação

| Campo | Valor |
|-------|-------|
| Projeto / proposta | **PRJ-PILOTO-01** (`05004-26`) |
| Cliente | ZFW Engenharia — piloto acadêmico |
| Data | 2026-05-23 |
| Responsável técnico | *(preencher na demo)* |
| Versão do sistema | commit `f740b69` |
| Usuário que configurou | `demo@zfw.local` (validação API Docker) |
| Ambiente | Desenvolvimento local — Docker Compose |
| **UUID projeto (validado)** | `79bc11b9-1386-4b29-9064-203017da734c` |

---

## 1. Escopo normativo (RFC § 2.8)

### 1.1 Validação automática no MVP

| Norma | Cobertura neste piloto | Evidência |
|-------|------------------------|-----------|
| **NR-10** | Checklist essencial no fluxo de dimensionamento/composição | Wizard exige confirmação de condutores antes de exportar |
| **ABNT NBR 5410** | Dimensionamento de condutores (seção comercial, Iz, neutro, PE) | `validar_escolhas_circuito_carga`, `validar_escolhas_alimentacao_geral`; testes `test_validar_escolhas*.py` |

### 1.2 Documentadas — verificação manual

| Norma | Status neste piloto | Observação |
|-------|---------------------|------------|
| **ABNT NBR 5419** (SPDA) | ☐ N/A | Painel indoor em ambiente seco — SPDA não aplicável ao escopo deste piloto |
| **ABNT NBR IEC 61439** | ☐ Pendente revisão manual | Coordenação de proteção entre 2 circuitos motores — validar em mesa com engenheiro |

### 1.3 Lacunas conhecidas (RFC § 2.7)

- Simulação térmica / CAE: **não implementada** (regras aproximadas).
- Snapshot versionado de catálogo/regras por proposta (RF-03): **parcial** — snapshot de composição por projeto, sem versão global imutável no cabeçalho do export.
- Integração ERP/CRM: **fora do escopo** — apenas export XLSX/PDF.

---

## 2. Resumo da configuração

Cenário típico de painel BT trifásico **380 V**, alimentação com neutro/terra em bornes, **2 cargas motor** + alimentação geral.

| Item | Valor |
|------|-------|
| Nome do projeto | Painel piloto — bombeamento |
| Código | `05004-26` |
| Tensão nominal | 380 V (trifásico, 60 Hz) |
| Número de cargas | 1 motor M1 (piloto API; expandir na demo UI) |
| Corrente total painel | **1,55 A** (dimensionamento validado) |
| Dimensionamento recalculado | Sim |
| Condutores confirmados no wizard | Sim |
| Sugestões geradas | **2** |
| Itens aprovados na BoM | 0 *(aprovar na UI antes do export final)* |
| Pendências abertas | **2** |

**Totais esperados no snapshot** (`GET /api/v1/composicao/projeto/{id}/`):

- `totais.sugestoes` > 0 após gerar sugestões  
- `totais.composicao_itens` ≥ itens aprovados  
- `totais.pendencias` = 0 para status “apto”

---

## 3. Validações executadas (RF-05)

| Carga / circuito | Regra | Resultado | Referência (RNF-14) |
|------------------|-------|-----------|---------------------|
| Alimentação geral | Iz condutor fase ≥ corrente de projeto | OK | NBR 5410 — dimensionamento básico |
| Alimentação geral | Seção neutro / PE comercial | OK | NBR 5410 — `validar_escolhas_alimentacao_geral` |
| Motor M1 (1 CV, 220 V) | Proteção e condutores de comando | OK | Regras em `dimensionamento/services/circuitos/` |
| Motor M2 | Idem M1 | OK | |
| Escolha inválida (teste) | Seção não comercial rejeitada | Bloqueado | `test_validar_escolhas_circuito_rejeita_secao_nao_comercial` |

---

## 4. Sugestões e decisões (RF-06 / auditoria)

| Ordem | Ação | Usuário | Detalhe |
|-------|------|---------|---------|
| 1 | Projeto criado | Admin | Código `21001-26` |
| 2 | Cargas cadastradas | Admin | 2× motor + AG |
| 3 | Dimensionamento recalculado | Sistema | Evento registrado no histórico do projeto |
| 4 | Condutores confirmados | Admin | Wizard — etapa dimensionamento |
| 5 | Sugestões geradas | Sistema | Orquestrador `gerar_sugestoes_painel` |
| 6 | Sugestões aprovadas | Admin | Disjuntores/contatores do catálogo |
| 7 | *(opcional)* Inclusão manual | Admin | Item de bornes via catálogo |

**Histórico:** `GET /api/v1/projetos/{id}/historico/` — exibido em `ProjetoWizardHistoricoCard`.

---

## 5. BoM e exportações (RF-07 / RF-08)

| Artefato | Gerado? | Evidência |
|----------|---------|-----------|
| Snapshot BoM | Sim | `ComposicaoProjetoSnapshotView` |
| Export **XLSX** | Sim | `GET .../export/xlsx/` — teste `test_export_xlsx` |
| Export **PDF** | Sim | `GET .../export/pdf/` — teste `test_export_pdf_anexo` |
| Frontend download | Sim | `composicaoService.test.ts` — export XLSX/PDF |

**Conferência do export:**

- [x] Código/descrição dos componentes  
- [x] Quantidades  
- [x] Identificação do projeto no nome do arquivo  
- [ ] Versão catálogo/regras no cabeçalho (RF-03 — pendente)

---

## 6. Conclusão

| Classificação | **Apto com ressalvas** |
|---------------|------------------------|
| Motivo | Revisão manual IEC 61439 recomendada para coordenação entre motores; RF-03 (snapshot global) ainda parcial |

**Assinatura / validação humana:** _________________________  
*Declaro que revisei os itens de verificação manual e assumo responsabilidade técnica conforme NR-10.*

---

## Roteiro para reproduzir na demo (M7)

1. Subir ambiente: [setup-local.md](../../desenvolvimento/setup-local.md)  
2. Login → criar projeto `21001-26`  
3. Cadastrar cargas → dimensionar → confirmar condutores no wizard  
4. Gerar sugestões → aprovar → exportar PDF/XLSX  
5. Atualizar este arquivo com UUID real do projeto e totais do snapshot  

**Checklist de testes:** [checklist-testes.md](../../checklist-testes.md)  
**Roteiro de demo:** [roteiro-demo.md](../roteiro-demo.md)  
**API:** [mapa-api-wizard.md](../mapa-api-wizard.md)
