# Produção — ponte fiscal na máquina com certificado A3

## Checklist

| # | Item |
|---|------|
| 1 | `FISCAL_AGENT_TOKEN` e `FISCAL_EMPRESA_CNPJ` no `.env` do **backend** (VPS) |
| 2 | Mesmo token em `tools/fiscal_ponte/.env` → `FISCAL_PONTE_AGENT_TOKEN` |
| 3 | `FISCAL_PONTE_CNPJ` = mesmo CNPJ da empresa |
| 4 | `FISCAL_PONTE_API_BASE_URL=https://api.zfw.com.br/api/v1` |
| 5 | ACBrMonitorPLUS: TCP **3434**, certificado A3, pasta de saída XML |
| 6 | `FISCAL_PONTE_SEFAZ_PROVIDER=acbr` |
| 7 | `fiscal-ponte setup-check` — todos `[OK]` |
| 8 | Agendamento (tarefa ou serviço NSSM) |

## Homologação prévia

Siga [HOMOLOGACAO.md](HOMOLOGACAO.md) no ambiente local antes de apontar para produção.

## Opção A — Tarefa agendada (recomendado)

Executa **um** `sync` por intervalo; mais simples de depurar.

```powershell
# Administrador PowerShell
powershell -ExecutionPolicy Bypass -File scripts\fiscal-ponte-install-task.ps1 -IntervalMinutes 15
```

Logs: `tools\fiscal_ponte\logs\fiscal_ponte.log` (defina `FISCAL_PONTE_LOG_DIR` se quiser outro caminho).

Teste manual:

```powershell
powershell -File scripts\fiscal-ponte-sync.ps1
```

Remover:

```powershell
powershell -File scripts\fiscal-ponte-uninstall-task.ps1
```

## Opção B — Serviço Windows (NSSM)

Processo contínuo com `fiscal-ponte run-service` (intervalo entre ciclos no `.env`).

1. Instale [NSSM](https://nssm.cc/) e coloque `nssm.exe` no PATH.
2. `scripts\fiscal-ponte-setup.ps1`
3. Configure `.env` com `acbr`
4.:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\fiscal-ponte-install-service.ps1 -IntervalMinutes 15
nssm start ZFWFiscalPonte
```

Logs: `tools\fiscal_ponte\logs\` (`fiscal_ponte.log`, `service-stdout.log`).

## Retry API (5xx)

Erros **5xx** e falhas de rede na API central são repetidos com backoff (default 3 tentativas, 2s base). Configurável:

```env
FISCAL_PONTE_API_RETRY_MAX=3
FISCAL_PONTE_API_RETRY_BASE_SEC=2
```

**Não** repete 400/401/403 — corrija token ou XML.

## Monitorização

- Portal: **Fiscal** → cartão **Sincronização SEFAZ (NSU)**
- `ultima_consulta`, `ultimo_cstat`, `bloqueado_ate` no servidor
- Log local: `tools\fiscal_ponte\logs\fiscal_ponte.log`

## Ordem de arranque na máquina local

1. Certificado A3 conectado  
2. ACBrMonitorPLUS em execução (ícone na bandeja)  
3. Tarefa agendada ou serviço `ZFWFiscalPonte`  

Se `cStat=656`, a ponte grava `bloqueado_ate` (+1h) e não consulta até expirar.
