param(
    [string] $TaskName = "ZFW-Fiscal-Ponte-Sync"
)

$ErrorActionPreference = "Stop"
$task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($task) {
    Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
    Write-Host "Tarefa '$TaskName' removida."
} else {
    Write-Host "Tarefa '$TaskName' nao encontrada."
}
