# Glossário

Termos do domínio e do **[RFC](../rfc.pdf)**. Ver também [resumo RFC](../portfolio/rfc.md).

| Termo | Definição |
|-------|-----------|
| **CPQ** | Configure-Price-Quote — configurar produto, precificar e gerar proposta (RFC). |
| **BoM** | Bill of Materials — lista de materiais do painel com quantidades e custos (RF-07). |
| **Wizard** | Assistente passo a passo de configuração do painel (RF-04). |
| **Projeto** | Unidade de trabalho de engenharia / proposta para um painel (ligado a RF-09). |
| **Carga** | Circuito ou equipamento alimentado (motor, resistência, alimentação geral, etc.). |
| **Dimensionamento** | Cálculo e escolha de proteções, condutores e componentes (regras NBR 5410, NR-10 no MVP). |
| **Composição** | Consolidação da BoM: sugestões automáticas e ajustes manuais. |
| **Catálogo** | Base de produtos e especificações (RF-02); suporte a busca (RF-10). |
| **Motor de regras** | Validações de compatibilidade e limites durante o wizard (RF-05). |
| **Snapshot** | Versão fixa de catálogo/regras referenciada por uma proposta (RF-03). |
| **Relatório de conformidade** | Itens normativos cobertos e lacunas por proposta (RNF-15). |
| **Módulo ERP** | Área do monorepo fora do MVP do RFC (ex.: `tarefas`, `crm`). |

## Normas (escopo MVP — RFC § 2.8)

| Norma | No MVP |
|-------|--------|
| NR-10 | Validação automática (essencial) |
| ABNT NBR 5410 | Validação automática (dimensionamento básico) |
| ABNT NBR 5419 | Documentada; sem bloqueio automático |
| ABNT NBR IEC 61439 | Documentada; verificação manual no relatório |

O sistema **não substitui** laudos ou ART; casos fora do escopo devem indicar revisão por responsável técnico.
