# Regista tarefa agendada Windows para fiscal-ponte sync (a cada N minutos).
param(
    [int] $IntervalMinutes = 15,
    [string] $TaskName = "ZFW-Fiscal-Ponte-Sync"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
$SyncScript = Join-Path $PSScriptRoot "fiscal-ponte-sync.ps1"

if (-not (Test-Path $SyncScript)) {
    Write-Error "Script nao encontrado: $SyncScript"
}

$existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($existing) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Tarefa anterior removida."
}

$action = New-ScheduledTaskAction `
    -Execute "powershell.exe" `
    -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$SyncScript`"" `
    -WorkingDirectory $Root

$trigger = New-ScheduledTaskTrigger `
    -Once -At (Get-Date).Date `
    -RepetitionInterval (New-TimeSpan -Minutes $IntervalMinutes) `
    -RepetitionDuration (New-TimeSpan -Days 3650)

$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -StartWhenAvailable `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2)

Register-ScheduledTask `
    -TaskName $TaskName `
    -Action $action `
    -Trigger $trigger `
    -Settings $settings `
    -Description "Sincroniza NF-e SEFAZ via ponte fiscal ZFW (ACBr + API)" `
    -RunLevel Highest | Out-Null

Write-Host "Tarefa '$TaskName' criada — sync a cada $IntervalMinutes minuto(s)."
Write-Host "Teste manual: powershell -File scripts\fiscal-ponte-sync.ps1"
Write-Host "Remover: powershell -File scripts\fiscal-ponte-uninstall-task.ps1"
