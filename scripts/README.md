# Scripts utilitários

## `up.ps1` / `down.ps1`

Sobem e derrubam o ambiente local usando o compose base e o compose de monitoramento:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/up.ps1
powershell -ExecutionPolicy Bypass -File scripts/down.ps1
```

O `up.ps1` recria os containers com `--force-recreate` e remove órfãos.
O `down.ps1` remove containers, rede do projeto e órfãos. Para apagar também os volumes
locais (`postgres_data`, `grafana_data`, `prometheus_data`, etc.), use:

```powershell
powershell -ExecutionPolicy Bypass -File scripts/down.ps1 -Volumes
```

## `validar-demo-api.ps1`

**Para que serve:** validar **antes da gravação** ou da apresentação que o ambiente Docker + API do wizard estão funcionando de ponta a ponta — **sem usar a interface gráfica**.

**O que o script faz, em sequência:**

1. Verifica `GET /api/v1/health/`
2. Faz login JWT (`demo@zfw.local`)
3. Cria um projeto de teste (código alocado automaticamente)
4. Cadastra uma carga motor
5. Executa dimensionamento e confirma revisão de condutores
6. Gera sugestões de composição e lê totais da BoM
7. Baixa export **XLSX** e **PDF**
8. Lista histórico do projeto

**Quando usar:**

| Situação | Usar o script? |
|----------|----------------|
| Antes de gravar o vídeo da demo | **Sim** — garante que Docker e API respondem |
| Substituir a demo na UI no vídeo | **Não** — o professor espera ver o **navegador** e o wizard |
| Provar RF-01…RF-08 com evidência técnica | **Sim** — saída no terminal + arquivos em `%TEMP%\demo-pac-validacao` |
| Criar/atualizar usuário `demo@zfw.local` | **Sim** — senha padrão `DemoPac2026!` (só local) |

**Como executar:**

```powershell
powershell -ExecutionPolicy Bypass -File scripts/up.ps1
powershell -ExecutionPolicy Bypass -File scripts/validar-demo-api.ps1
```

**Não commitar** alterações com senhas reais de produção; o script usa credenciais apenas para ambiente de desenvolvimento.

## `fiscal-ponte-sync.ps1`

Executa um ciclo da **ponte fiscal** (máquina local com certificado A3 + ACBrMonitor). Requer venv em `tools/fiscal_ponte` e `.env` configurado (ver [tools/fiscal_ponte/README.md](../tools/fiscal_ponte/README.md)).

```powershell
powershell -ExecutionPolicy Bypass -File scripts/fiscal-ponte-sync.ps1
```

O token em `FISCAL_PONTE_AGENT_TOKEN` deve ser **igual** ao `FISCAL_AGENT_TOKEN` do backend na VPS.

## `fiscal-ponte-setup.ps1`

Cria venv, copia `.env.example` → `.env` se necessário e executa `setup-check`.

## `fiscal-ponte-homolog.ps1`

Envia XML de `tools/fiscal_ponte/homolog/fixtures` para a API (modo folder). Ver [HOMOLOGACAO.md](../tools/fiscal_ponte/HOMOLOGACAO.md).

## `fiscal-ponte-install-task.ps1`

Cria tarefa agendada **ZFW-Fiscal-Ponte-Sync** (sync a cada 15 min por omissão). Requer PowerShell como administrador.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\fiscal-ponte-install-task.ps1 -IntervalMinutes 15
```

## `fiscal-ponte-uninstall-task.ps1`

Remove a tarefa agendada.

## `fiscal-ponte-install-service.ps1`

Instala serviço Windows via **NSSM** (`run-service` contínuo). Ver [PRODUCAO.md](../tools/fiscal_ponte/PRODUCAO.md).
