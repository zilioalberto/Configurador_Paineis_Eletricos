param(
    [switch]$Volumes
)

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$composeBase = Join-Path $repoRoot "infra\docker\docker-compose.yml"
$composeMonitoring = Join-Path $repoRoot "infra\docker\docker-compose.monitoring.yml"
$envFile = Join-Path $repoRoot ".env"

$argsList = @(
    "compose",
    "--env-file", $envFile,
    "-f", $composeBase,
    "-f", $composeMonitoring,
    "down",
    "--remove-orphans"
)

if ($Volumes) {
    $argsList += "-v"
}

Set-Location $repoRoot

docker @argsList
