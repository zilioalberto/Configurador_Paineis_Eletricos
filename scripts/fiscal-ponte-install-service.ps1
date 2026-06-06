# Instala servico Windows via NSSM (loop run-service). Requer NSSM no PATH.
param(
    [string] $ServiceName = "ZFWFiscalPonte",
    [int] $IntervalMinutes = 15
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PonteDir = Join-Path $Root "tools\fiscal_ponte"
$Python = Join-Path $PonteDir ".venv\Scripts\python.exe"

$nssm = Get-Command nssm -ErrorAction SilentlyContinue
if (-not $nssm) {
    Write-Error @"
NSSM nao encontrado no PATH.
Opcoes:
  1) Instale NSSM (https://nssm.cc/) e adicione ao PATH
  2) Use tarefa agendada: scripts\fiscal-ponte-install-task.ps1
"@
}

if (-not (Test-Path $Python)) {
    Write-Error "Execute primeiro: scripts\fiscal-ponte-setup.ps1"
}

if (-not (Test-Path (Join-Path $PonteDir ".env"))) {
    Write-Error "Configure tools\fiscal_ponte\.env antes do servico."
}

$envFile = Join-Path $PonteDir ".env"
$logDir = Join-Path $PonteDir "logs"
New-Item -ItemType Directory -Force -Path $logDir | Out-Null

# NSSM: AppDirectory deve ser a pasta da ponte para o .env e logs
& nssm stop $ServiceName 2>$null
& nssm remove $ServiceName confirm 2>$null

& nssm install $ServiceName $Python "-m" "fiscal_ponte" "run-service" "--interval-min" $IntervalMinutes
& nssm set $ServiceName AppDirectory $PonteDir
& nssm set $ServiceName DisplayName "ZFW Ponte Fiscal (NF-e SEFAZ)"
& nssm set $ServiceName Description "Sincroniza NF-e com certificado A3 via ACBrMonitor e API ZFW"
& nssm set $ServiceName Start SERVICE_AUTO_START
& nssm set $ServiceName AppStdout (Join-Path $logDir "service-stdout.log")
& nssm set $ServiceName AppStderr (Join-Path $logDir "service-stderr.log")
& nssm set $ServiceName AppRotateFiles 1
& nssm set $ServiceName AppRotateBytes 1048576

Write-Host "Servico '$ServiceName' instalado. Iniciar:"
Write-Host "  nssm start $ServiceName"
Write-Host "Parar/remover:"
Write-Host "  nssm stop $ServiceName"
Write-Host "  nssm remove $ServiceName confirm"
