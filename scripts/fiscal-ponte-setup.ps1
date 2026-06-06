# Instala venv da ponte fiscal, cria .env se necessário e executa setup-check.
$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$PonteDir = Join-Path $Root "tools\fiscal_ponte"

Push-Location $PonteDir
try {
    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        Write-Host "Criando venv..."
        python -m venv .venv
        & .\.venv\Scripts\pip.exe install -e ".[dev]"
    }

    if (-not (Test-Path ".env")) {
        Copy-Item ".env.example" ".env"
        Write-Host "Criado .env a partir de .env.example — edite token e CNPJ antes do sync."
    }

    & .\.venv\Scripts\python.exe -m fiscal_ponte setup-check
    exit $LASTEXITCODE
}
finally {
    Pop-Location
}
