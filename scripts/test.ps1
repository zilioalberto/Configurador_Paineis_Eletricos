<#
.SYNOPSIS
    Executa testes unitários (backend pytest + frontend Vitest).

.DESCRIPTION
    Por omissão usa Docker Compose (serviços backend e frontend).
    Use -Local para correr na máquina (requer Python e Node no PATH).

.PARAMETER Local
    Correr pytest e npm fora dos contentores.

.PARAMETER Coverage
    Incluir relatórios de cobertura (pytest-cov e vitest --coverage).

.PARAMETER BackendOnly
    Apenas testes Django.

.PARAMETER FrontendOnly
    Apenas testes Vitest.

.EXAMPLE
    .\scripts\test.ps1

.EXAMPLE
    .\scripts\test.ps1 -Coverage

.EXAMPLE
    .\scripts\test.ps1 -Local -BackendOnly
#>
param(
    [switch]$Local,
    [switch]$Coverage,
    [switch]$BackendOnly,
    [switch]$FrontendOnly
)

$ErrorActionPreference = "Stop"
$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
Set-Location $RepoRoot

$composeFile = Join-Path $RepoRoot "infra\docker\docker-compose.yml"
if (-not (Test-Path $composeFile)) {
    Write-Error "Compose não encontrado: $composeFile"
}

function Invoke-BackendTests {
    param([bool]$UseLocal, [bool]$WithCoverage)

    $pytestArgs = @("configuracoes/tests", "-v", "--tb=short")
    if ($WithCoverage) {
        $pytestArgs += @("--cov=configuracoes", "--cov-report=term-missing")
    }

    if ($UseLocal) {
        Push-Location (Join-Path $RepoRoot "backend")
        try {
            $env:DJANGO_SETTINGS_MODULE = "configuracoes.settings_ci"
            python -m pytest @pytestArgs
            if ($LASTEXITCODE -ne 0) { throw "pytest falhou com código $LASTEXITCODE" }
        }
        finally {
            Remove-Item Env:DJANGO_SETTINGS_MODULE -ErrorAction SilentlyContinue
            Pop-Location
        }
    }
    else {
        $pytestCmd = [string]::Join(' ', $pytestArgs)
        $inner = "cd /app && export DJANGO_SETTINGS_MODULE=configuracoes.settings_ci && python -m pytest $pytestCmd"
        docker compose -f "$composeFile" exec -T backend sh -c $inner
        if ($LASTEXITCODE -ne 0) { throw "pytest no Docker falhou com código $LASTEXITCODE" }
    }
}

function Invoke-FrontendTests {
    param([bool]$UseLocal, [bool]$WithCoverage)

    $npmScript = if ($WithCoverage) { "test:coverage" } else { "test" }

    if ($UseLocal) {
        Push-Location (Join-Path $RepoRoot "frontend")
        try {
            npm run $npmScript
            if ($LASTEXITCODE -ne 0) { throw "npm run $npmScript falhou com código $LASTEXITCODE" }
        }
        finally {
            Pop-Location
        }
    }
    else {
        $inner = "cd /app && npm run $npmScript"
        docker compose -f "$composeFile" exec -T frontend sh -c $inner
        if ($LASTEXITCODE -ne 0) { throw "Vitest no Docker falhou com código $LASTEXITCODE" }
    }
}

Write-Host "Repositório: $RepoRoot" -ForegroundColor Cyan
if ($Local) {
    Write-Host "Modo: local (sem Docker)" -ForegroundColor Yellow
}
else {
    Write-Host "Modo: Docker (compose: infra/docker/docker-compose.yml)" -ForegroundColor Yellow
}
if ($Coverage) { Write-Host "Cobertura: ativada" -ForegroundColor Yellow }

$runBackend = -not $FrontendOnly
$runFrontend = -not $BackendOnly

if ($runBackend) {
    Write-Host "`n=== Backend (pytest) ===" -ForegroundColor Green
    Invoke-BackendTests -UseLocal:$Local -WithCoverage:$Coverage
}

if ($runFrontend) {
    Write-Host "`n=== Frontend (Vitest) ===" -ForegroundColor Green
    Invoke-FrontendTests -UseLocal:$Local -WithCoverage:$Coverage
}

Write-Host "`nTestes concluídos com sucesso." -ForegroundColor Green
