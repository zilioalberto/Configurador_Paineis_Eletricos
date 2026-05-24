$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$composeBase = Join-Path $repoRoot "infra\docker\docker-compose.yml"
$composeMonitoring = Join-Path $repoRoot "infra\docker\docker-compose.monitoring.yml"
$envFile = Join-Path $repoRoot ".env"

Set-Location $repoRoot

docker compose `
  --env-file $envFile `
  -f $composeBase `
  -f $composeMonitoring `
  up `
  -d `
  --build `
  --force-recreate `
  --remove-orphans
