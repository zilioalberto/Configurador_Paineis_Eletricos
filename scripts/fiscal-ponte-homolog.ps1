# Homologação: envia XML de exemplo (homolog/fixtures) para a API local.
# Pré-requisitos: backend no ar, FISCAL_AGENT_TOKEN no .env do backend e da ponte (mesmo valor).
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PonteDir = Join-Path $Root "tools\fiscal_ponte"
$VenvPython = Join-Path $PonteDir ".venv\Scripts\python.exe"

if (-not (Test-Path $VenvPython)) {
    Write-Host "Execute primeiro: scripts\fiscal-ponte-setup.ps1"
    exit 1
}

Push-Location $PonteDir
try {
    & $VenvPython -m fiscal_ponte homolog
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
