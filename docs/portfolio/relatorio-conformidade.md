# Relatório de conformidade (RNF-15)

Guia para produzir o **Relatório de Conformidade por proposta/projeto**, exigido pelo [RFC](../rfc.pdf) (RNF-15) e alinhado ao § 2.8 e § 3.5.

> O sistema **não substitui** laudo técnico ou ART. Este relatório documenta o que o **software** validou, sugeriu ou deixou como lacuna.

---

## Quando gerar

- Ao **fechar** uma configuração no wizard (antes de exportar BoM PDF/XLSX).
- Na **demo do portfólio** — usar um projeto piloto com dados realistas.
- Na **entrega final (M7)** — anexar exemplo impresso ou PDF ao material acadêmico.

---

## Identificação do relatório

Preencher no cabeçalho de cada instância:

| Campo | Exemplo |
|-------|---------|
| Projeto / proposta | `PRJ-2025-0042` |
| Cliente | Nome ou “Piloto portfólio” |
| Data | 2025-05-23 |
| Responsável técnico | Nome do engenheiro |
| Versão do sistema | commit SHA ou tag git |
| Usuário que configurou | e-mail do login |

---

## 1. Escopo normativo (RFC § 2.8)

### 1.1 Validação automática no MVP (implementada no código)

| Norma | O que o sistema cobre hoje | Onde verificar no código |
|-------|----------------------------|---------------------------|
| **NR-10** | Regras essenciais de seleção/instalação (checklist básico no fluxo) | Serviços de dimensionamento/composição; expandir lista neste doc |
| **ABNT NBR 5410** | Dimensionamento básico: corrente de projeto, proteção, seções mínimas de condutores | `backend/core/calculos/condutores.py`, `dimensionamento/services/circuitos/validar_escolhas.py` |

**Evidências de teste:** `backend/apps/configurador_paineis/dimensionamento/tests/test_validar_escolhas*.py`

### 1.2 Documentadas sem bloqueio automático (MVP)

| Norma | Tratamento no relatório |
|-------|-------------------------|
| **ABNT NBR 5419** (SPDA) | Seção “Verificação manual recomendada” — invólucro/aterramento |
| **ABNT NBR IEC 61439** | Seção “Coordenação / verificação de conjunto” — checagem manual |

Marcar cada item como: ☑ Verificado manualmente · ☐ Não aplicável · ☐ Pendente

### 1.3 Lacunas conhecidas (honestidade acadêmica)

Listar regras **não** automatizadas no MVP, por exemplo:

- Simulação térmica detalhada (RFC § 2.7).
- Coordenação completa IEC 61439 com bloqueio automático.
- SPDA completo conforme NBR 5419.

---

## 2. Resumo da configuração (dados do projeto)

Extrair do wizard / API (`GET /api/v1/projetos/{id}/`, dimensionamento, composição):

| Item | Valor |
|------|-------|
| Tensão / alimentação | |
| Corrente de projeto (A) | |
| Número de cargas | |
| Dimensionamento recalculado em | data/hora |
| Condutores confirmados no wizard | Sim / Não |
| Sugestões geradas | quantidade |
| Itens aprovados na BoM | quantidade |
| Pendências abertas | quantidade |

**API útil:** `GET /api/v1/composicao/projeto/{projeto_id}/` — totais em `totais`.

---

## 3. Validações executadas pelo sistema (RF-05)

Para cada **carga** ou **circuito**, registrar:

| Carga / circuito | Regra aplicada | Resultado | Referência normativa (RNF-14) |
|------------------|----------------|-----------|-------------------------------|
| Alimentação geral | Iz, neutro, PE | OK / Bloqueado / Alerta | NBR 5410 — ex.: 6.4.3.1.2 |
| Motor M1 | … | | |

**Fonte técnica:** resultado do `POST .../dimensionamento/.../recalcular/` e mensagens de `validar_escolhas_*`.

### Template de referência normativa (RNF-14)

Ao documentar uma regra no código, usar formato:

```text
regra_id: CONDUTOR_SECAO_MINIMA
norma: ABNT NBR 5410:2004
secao: 6.4.3.1.2
descricao: Seção comercial mínima do condutor de fase
implementacao: backend/core/calculos/condutores.py
```

---

## 4. Sugestões e decisões do usuário (RF-06 / auditoria)

| Data/hora | Ação | Usuário | Detalhe |
|-----------|------|---------|---------|
| | Sugestão aprovada | | disjuntor SKU … |
| | Inclusão manual | | produto … |
| | Pendência | | motivo … |

**Fonte:** `GET /api/v1/projetos/{id}/historico/` e histórico na UI do wizard (`ProjetoWizardHistoricoCard`).

---

## 5. BoM e exportações (RF-07 / RF-08)

| Artefato | Gerado? | Arquivo / endpoint |
|----------|---------|-------------------|
| Lista de materiais (snapshot) | | `GET /composicao/projeto/{id}/` |
| Export XLSX | | `GET .../export/xlsx/` |
| Export PDF | | `GET .../export/pdf/` |

Conferir se o export inclui:

- [ ] Código/descrição dos componentes  
- [ ] Quantidades  
- [ ] Identificação do projeto  
- [ ] (Desejável RF-03) Versão do catálogo/regras no cabeçalho  

---

## 6. Conclusão do relatório

| Classificação | Critério |
|---------------|----------|
| **Apto para orçamento interno** | Sem pendências bloqueantes; dimensionamento confirmado |
| **Apto com ressalvas** | Pendências documentadas + verificação manual listada |
| **Não apto** | Pendências críticas ou dimensionamento desatualizado |

**Assinatura / validação humana:** _________________________  
*Declaro que revisei os itens marcados como verificação manual e assumo responsabilidade técnica conforme NR-10.*

---

**Exemplo preenchido:** [exemplos/relatorio-conformidade-PRJ-PILOTO-01.md](exemplos/relatorio-conformidade-PRJ-PILOTO-01.md)

---

## 7. Exemplo preenchido (piloto — adaptar)

```markdown
Ver arquivo completo: exemplos/relatorio-conformidade-PRJ-PILOTO-01.md
```

---

## Evolução (pós-MVP)

- [ ] Endpoint ou job que gera este relatório em **PDF** automaticamente (RNF-15 completo).
- [ ] Vincular `snapshot_id` de catálogo/regras (RF-03) no cabeçalho.
- [ ] Tabela máquina-legível `Regra ↔ Norma` gerada a partir do código.

**Rastreabilidade:** [rastreabilidade-requisitos.md](rastreabilidade-requisitos.md) · **Checklist:** [checklist-testes.md](../checklist-testes.md)
