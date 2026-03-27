$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        $line = $_.Trim()

        if (-not $line) { return }
        if ($line.StartsWith("#")) { return }

        if ($line -match '^\s*([^=]+?)\s*=\s*(.*)\s*$') {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim()

            if (
                ($value.StartsWith('"') -and $value.EndsWith('"')) -or
                ($value.StartsWith("'") -and $value.EndsWith("'"))
            ) {
                $value = $value.Substring(1, $value.Length - 2)
            }

            Set-Item -Path "Env:$name" -Value $value
        }
    }
}

$token = $env:SONAR_TOKEN

if (-not $token) {
    Write-Host "❌ Defina SONAR_TOKEN no arquivo .env da raiz do projeto ou no ambiente."
    exit 1
}

Write-Host "Root detectado: $root"
Write-Host ".env esperado em: $envFile"
Write-Host ".env existe? $(Test-Path $envFile)"

if ($token) {
    Write-Host "SONAR_TOKEN carregado: SIM"
    Write-Host "Tamanho do token: $($token.Length)"
    Write-Host "Prefixo do token: $($token.Substring(0, [Math]::Min(6, $token.Length)))..."
} else {
    Write-Host "SONAR_TOKEN carregado: NAO"
}

Write-Host "🚀 Iniciando análise SonarQube..."

docker run --rm `
    -e SONAR_HOST_URL="http://host.docker.internal:9000" `
    -e SONAR_TOKEN="$token" `
    -v "${root}:/usr/src" `
    sonarsource/sonar-scanner-cli

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Análise concluída com sucesso."
} else {
    Write-Host "❌ Erro durante a análise."
    exit $LASTEXITCODE
}