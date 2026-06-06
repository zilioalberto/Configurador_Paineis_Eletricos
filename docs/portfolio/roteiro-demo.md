# Roteiro de demo — Portfólio (M7)

Script para **gravação ou apresentação ao vivo** (~8–12 min). Alinhado ao [RFC](../rfc.pdf): wizard CPQ, validações, BoM e export.

> **Como gravar a tela (ferramentas, checklist, ensaio):** [gravacao-demo.md](gravacao-demo.md)

**Material de apoio**

- [Relatório piloto PRJ-PILOTO-01](exemplos/relatorio-conformidade-PRJ-PILOTO-01.md)
- [Mapa de API](mapa-api-wizard.md)
- [Checklist de testes](../checklist-testes.md)

---

## 0. Antes da demo (15–30 min)

### Subir o ambiente

```powershell
cd "D:\Portifolio_Cursor_5 23052026"
copy .env.example .env
# Editar .env: DB_PASSWORD (obrigatório), DJANGO_SECRET_KEY

docker compose -f infra/docker/docker-compose.yml up --build
```

| Serviço | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| API | http://localhost:8000/api/v1/ |
| Health | http://localhost:8000/api/v1/health/ |
| Admin Django | http://localhost:8000/admin/ |

### Criar usuário de demo (se ainda não existir)

**Opção A — script de validação (recomendado):** cria/atualiza `demo@zfw.local` e executa todo o fluxo API:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/validar-demo-api.ps1
```

**Opção B — manual:**

```powershell
docker exec -it configurador_painel_backend python manage.py createsuperuser
```

> **Conta de demo validada (2026-05-23):** `demo@zfw.local` / `DemoPac2026!` — **somente ambiente local**; não usar em produção.

### Catálogo mínimo

Garanta alguns produtos no catálogo (disjuntores, contatores, bornes) — via Admin ou tela **Catálogo** — para as sugestões da composição funcionarem.

### Variáveis para a API (PowerShell)

```powershell
$BaseUrl = "http://localhost:8000/api/v1"
$Email   = "demo@zfw.local"
$Senha   = "DemoPac2026!"
```

---

## 1. Roteiro na interface (fala sugerida)

### Abertura (30 s)

> “Este é o **módulo de auxílio à escolha de materiais para orçamentos de painéis**, entregue no portfólio: um **wizard** que guia o orçamentista, **valida regras da NBR 5410** e gera a **lista de materiais (BoM)** com exportação. O repositório tem outros módulos ERP em evolução, mas o escopo do PAC é este fluxo.”

Mostrar: [README](../../README.md) ou [escopo-portfolio.md](../visao-geral/escopo-portfolio.md) *(opcional, 10 s)*.

---

### 1.1 Login — RF-01 (45 s)

| Passo | Ação |
|-------|------|
| 1 | Abrir http://localhost:5173 |
| 2 | Login com e-mail + senha do `createsuperuser` |
| 3 | Mencionar JWT + permissões por perfil |

**Fala:** “Autenticação JWT; apenas utilizadores autorizados acessam projetos e composição.”

---

### 1.2 Novo projeto — RF-09 / início RF-04 (1,5 min)

| Passo | Ação |
|-------|------|
| 1 | Menu **Projetos** → **Novo** (`/projetos/novo`) |
| 2 | Usar **Alocar código** (se disponível) ou código `05001-26` |
| 3 | Nome: `Painel piloto — bombeamento` |
| 4 | Tensão **380 V**, trifásico, 60 Hz |
| 5 | Conexões neutro/terra: **Borne**; alimentação potência: **Borne** |
| 6 | Desmarcar PLC/climatização/seccionamento se não usar |
| 7 | Salvar |

**Fala:** “O **projeto** é a proposta de engenharia; no RFC equivale à gestão de proposta em rascunho.”

Anotar o **UUID** do projeto na barra de endereço (`/projetos/{id}/...`).

---

### 1.3 Wizard — visão geral (1 min)

| Passo | Ação |
|-------|------|
| 1 | Abrir **fluxo do projeto**: `/projetos/{id}/fluxo/cargas` |
| 2 | Mostrar **grade de etapas** e **checklist** |

**URLs das etapas**

| Etapa | URL |
|-------|-----|
| Wizard (cargas) | `/projetos/{id}/fluxo/cargas` |
| Wizard (dimensionamento) | `/projetos/{id}/fluxo/dimensionamento` |
| Wizard (composição) | `/projetos/{id}/fluxo/composicao` |

**Fala:** “O RFC descreve alimentação → proteção → comandos → invólucro → acessórios; na implementação organizamos em **projeto → cargas → dimensionamento → composição**.”

---

### 1.4 Cargas — RF-04 (2 min)

| Passo | Ação |
|-------|------|
| 1 | Pelo wizard, ir em **Cargas** ou `/cargas?projeto={id}` |
| 2 | Criar **Motor M1**: tag `M1`, 1 CV, 380 V, partida direta |
| 3 | Criar **Motor M2** (opcional) ou **Alimentação geral** conforme formulário |
| 4 | Voltar ao wizard — checklist “Cargas cadastradas” deve ficar verde |

**Fala:** “Cada carga alimenta o motor de dimensionamento e depois a composição de materiais.”

---

### 1.5 Dimensionamento — RF-05 (2–3 min)

| Passo | Ação |
|-------|------|
| 1 | `/projetos/{id}/fluxo/dimensionamento` ou `/dimensionamento` (com projeto no contexto) |
| 2 | Sistema calcula bitolas sugeridas (NBR 5410) |
| 3 | Mostrar circuito com **seção sugerida**; opcional: ajustar Iz/bitola |
| 4 | **Confirmar revisão de condutores** (obrigatório para liberar composição) |
| 5 | Wizard: etapa dimensionamento concluída |

**Fala:** “Validações automáticas — corrente, seções comerciais, neutro e PE — com testes em `validar_escolhas`. O sistema **bloqueia** combinações inválidas.”

---

### 1.6 Composição e sugestões — RF-06 / RF-07 (2–3 min)

| Passo | Ação |
|-------|------|
| 1 | `/composicao?projeto={id}` ou etapa **composição** no wizard |
| 2 | **Gerar sugestões** |
| 3 | Abrir uma sugestão → **alternativas** (RF-06) → **aprovar** |
| 4 | Opcional: **inclusão manual** de item do catálogo |
| 5 | Mostrar **totais** (sugestões, itens, pendências) |

**Fala:** “A BoM nasce das regras de dimensionamento + catálogo estruturado; o usuário aprova ou troca alternativas compatíveis.”

---

### 1.7 Exportação — RF-08 (1 min)

| Passo | Ação |
|-------|------|
| 1 | Na composição, exportar **XLSX** e **PDF** |
| 2 | Abrir arquivo — conferir lista e nome do projeto |
| 3 | Wizard: “pronto para exportar” no checklist |

**Fala:** “Entrega para o cliente ou orçamento comercial — sem integração ERP no MVP, conforme limitação do RFC.”

---

### 1.8 Histórico e encerramento (45 s)

| Passo | Ação |
|-------|------|
| 1 | No wizard, card **Histórico** — eventos (criação, dimensionamento, composição) |
| 2 | Mencionar [relatório de conformidade](exemplos/relatorio-conformidade-PRJ-PILOTO-01.md) (RNF-15) |

**Fala:** “Rastreabilidade de quem fez o quê; o relatório de conformidade documenta normas cobertas e lacunas.”

**Encerramento:** “823 testes automatizados no caminho crítico; próximo passo: deploy público e métricas p95 do RFC.”

---

## 2. Roteiro via API (Postman / PowerShell)

Útil para **backup** se a UI falhar ou para slide técnico.

### 2.1 Token

```powershell
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/token/" `
  -ContentType "application/json" `
  -Body (@{ email = $Email; password = $Senha } | ConvertTo-Json)

$Headers = @{ Authorization = "Bearer $($login.access)" }
```

### 2.2 Alocar código e criar projeto

```powershell
$codigo = (Invoke-RestMethod -Method Post -Uri "$BaseUrl/projetos/alocar-codigo/" -Headers $Headers).codigo

$projetoBody = @{
  nome = "Painel piloto API"
  codigo = $codigo
  descricao = "Demo PAC"
  cliente = "Cliente piloto"
  status = "EM_ANDAMENTO"
  tipo_painel = "DISTRIBUICAO"
  tipo_corrente = "CA"
  tensao_nominal = 380
  numero_fases = 3
  frequencia = 60
  possui_neutro = $true
  possui_terra = $true
  tipo_conexao_alimentacao_potencia = "BORNE"
  tipo_conexao_alimentacao_neutro = "BORNE"
  tipo_conexao_alimentacao_terra = "BORNE"
  tipo_corrente_comando = "CA"
  tensao_comando = 220
  possui_plc = $false
  possui_climatizacao = $false
  possui_seccionamento = $false
  fator_demanda = "1.00"
  degraus_margem_bitola_condutores = 0
} | ConvertTo-Json

$projeto = Invoke-RestMethod -Method Post -Uri "$BaseUrl/projetos/" `
  -Headers $Headers -ContentType "application/json" -Body $projetoBody

$ProjetoId = $projeto.id
Write-Host "ProjetoId = $ProjetoId"
```

### 2.3 Criar carga motor

```powershell
$cargaBody = @{
  projeto = $ProjetoId
  tag = "M1"
  descricao = "Motor bomba 1"
  tipo = "MOTOR"
  quantidade = 1
  exige_protecao = $true
  exige_comando = $true
  ativo = $true
  motor = @{
    potencia_corrente_valor = "1.00"
    potencia_corrente_unidade = "CV"
    tensao_motor = 380
    tipo_partida = "DIRETA"
  }
} | ConvertTo-Json -Depth 5

$carga = Invoke-RestMethod -Method Post -Uri "$BaseUrl/cargas/" `
  -Headers $Headers -ContentType "application/json" -Body $cargaBody
```

> Ajuste enums se a API retornar 400 — use valores exibidos nos erros ou no Admin.

### 2.4 Dimensionamento

```powershell
# GET calcula/sincroniza na primeira leitura
$dim = Invoke-RestMethod -Method Get -Uri "$BaseUrl/dimensionamento/projeto/$ProjetoId/" -Headers $Headers
Write-Host "Circuitos: $($dim.circuitos_carga.Count)  Corrente total: $($dim.corrente_total_painel_a) A"

# POST recalcular (opcional)
Invoke-RestMethod -Method Post -Uri "$BaseUrl/dimensionamento/projeto/$ProjetoId/recalcular/" `
  -Headers $Headers -ContentType "application/json" -Body "{}"

# PATCH confirmar revisão (corpo mínimo — validado em Docker 2026-05-23)
$patchBody = @{
  circuitos = @()
  alimentacao_geral = $null
  confirmar_revisao = $true
} | ConvertTo-Json

$dim2 = Invoke-RestMethod -Method Patch -Uri "$BaseUrl/dimensionamento/projeto/$ProjetoId/condutores/" `
  -Headers $Headers -ContentType "application/json" -Body $patchBody
Write-Host "Revisao confirmada: $($dim2.condutores_revisao_confirmada)"
```

> A resposta usa **`circuitos_carga`**, não `circuitos`. Se `confirmar_revisao` falhar com 400, percorra a UI de condutores e aprove cada circuito antes do PATCH.

### 2.5 Composição

```powershell
Invoke-RestMethod -Method Post `
  -Uri "$BaseUrl/composicao/projeto/$ProjetoId/gerar-sugestoes/" `
  -Headers $Headers -ContentType "application/json" `
  -Body (@{ limpar_antes = $true } | ConvertTo-Json)

$snap = Invoke-RestMethod -Method Get `
  -Uri "$BaseUrl/composicao/projeto/$ProjetoId/" -Headers $Headers

$snap.totais
```

### 2.6 Exportar arquivos

```powershell
$outDir = "$env:USERPROFILE\Downloads\demo-pac"
New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Invoke-WebRequest -Uri "$BaseUrl/composicao/projeto/$ProjetoId/export/xlsx/" `
  -Headers $Headers -OutFile "$outDir\composicao_$ProjetoId.xlsx"

Invoke-WebRequest -Uri "$BaseUrl/composicao/projeto/$ProjetoId/export/pdf/" `
  -Headers $Headers -OutFile "$outDir\composicao_$ProjetoId.pdf"
```

### 2.7 Histórico

```powershell
Invoke-RestMethod -Method Get -Uri "$BaseUrl/projetos/$ProjetoId/historico/" -Headers $Headers
```

---

## 3. Cronograma sugerido para gravação

| Min | Bloco |
|-----|--------|
| 0:00 | Abertura + escopo portfólio |
| 0:30 | Login |
| 1:15 | Criar projeto + entrar no wizard |
| 3:00 | Cargas |
| 5:30 | Dimensionamento + confirmação |
| 8:00 | Composição + sugestões |
| 10:00 | Export PDF/XLSX + histórico |
| 11:00 | RFC, testes CI, próximos passos |

---

## 4. Plano B (se algo falhar)

| Problema | Ação |
|----------|------|
| Sem produtos no catálogo | Mostrar catálogo + Admin; ou demo só dimensionamento |
| Sugestões vazias | Explicar dependência catálogo; inclusão manual |
| Docker lento | API via PowerShell (secção 2) + PDF já gerado |
| Erro 401 | Renovar token; verificar utilizador ativo |

---

## 5. Validação em Docker (2026-05-23)

Executado com `scripts/validar-demo-api.ps1` contra `docker compose up`:

| Passo | Resultado |
|-------|-----------|
| Health | OK |
| Login JWT | OK |
| Criar projeto | OK — ex. `05004-26` |
| Carga motor M1 | OK |
| Dimensionamento | OK — corrente total **1,55 A**, 1 circuito (`circuitos_carga`) |
| Confirmar condutores | OK — `condutores_revisao_confirmada: true` |
| Gerar sugestões | OK — 2 sugestões, 2 pendências |
| Export XLSX | OK — ~6 KB |
| Export PDF | OK — ~3,6 KB |
| Histórico | OK — 6 eventos |

**Projeto de referência (local):** `79bc11b9-1386-4b29-9064-203017da734c`

> Na UI da demo, **aprovar sugestões** reduz pendências antes do export final; o script API pode deixar `composicao_itens: 0` se nada foi aprovado ainda.

---

## 6. Após a demo

1. Percorrer o fluxo na **UI** e marcar walkthrough em [checklist-testes.md](../checklist-testes.md).
2. Aprovar sugestões na composição antes de gravar o export final.
3. Incluir link de gravação / URL de deploy no README (quando houver).

---

## 7. Checklist rápido do apresentador

- [ ] Docker no ar; health OK
- [ ] Utilizador demo criado
- [ ] Catálogo com itens
- [ ] Código do projeto anotado
- [ ] PDF/XLSX de ensaio gerados antes (opcional)
- [ ] Aba do RFC ou escopo-portfolio aberta (opcional)
