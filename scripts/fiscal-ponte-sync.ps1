# Executa um ciclo da ponte fiscal (máquina local com certificado A3).
# Requer: Python 3.11+, venv em tools\fiscal_ponte, ficheiro .env configurado.

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PonteDir = Join-Path $Root "tools\fiscal_ponte"

if (-not (Test-Path $PonteDir)) {
    Write-Error "Pasta nao encontrada: $PonteDir"
}

$VenvPython = Join-Path $PonteDir ".venv\Scripts\python.exe"
if (-not (Test-Path $VenvPython)) {
    Write-Error "Crie o venv: cd tools\fiscal_ponte; python -m venv .venv; pip install -e ."
}

Push-Location $PonteDir
try {
    if (-not $env:FISCAL_PONTE_LOG_DIR) {
        $env:FISCAL_PONTE_LOG_DIR = Join-Path $PonteDir "logs"
    }
    & $VenvPython -m fiscal_ponte sync @args
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
