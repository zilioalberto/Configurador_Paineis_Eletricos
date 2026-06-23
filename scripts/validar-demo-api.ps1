# Validação do roteiro de demo (API) — uso interno
$ErrorActionPreference = 'Stop'
$BaseUrl = 'http://localhost:8000/api/v1'
$Email = 'demopac@zfw.com.br'
$Senha = 'DemoPac2026!'

Write-Host '=== 1. Health ==='
$h = Invoke-RestMethod -Uri "$BaseUrl/health/"
Write-Host "health: $($h.status)"

Write-Host '=== 2. Login ==='
$login = Invoke-RestMethod -Method Post -Uri "$BaseUrl/auth/token/" `
  -ContentType 'application/json' `
  -Body (@{ email = $Email; password = $Senha } | ConvertTo-Json)
$Headers = @{ Authorization = "Bearer $($login.access)" }
Write-Host 'token OK'

Write-Host '=== 3. Projeto ==='
$codigo = (Invoke-RestMethod -Method Post -Uri "$BaseUrl/projetos/alocar-codigo/" -Headers $Headers).codigo
$projetoBody = @{
  nome = 'Painel piloto API validacao'
  codigo = $codigo
  descricao = 'Demo PAC script'
  cliente = 'Cliente piloto'
  status = 'EM_ANDAMENTO'
  tipo_painel = 'DISTRIBUICAO'
  tipo_corrente = 'CA'
  tensao_nominal = 380
  numero_fases = 3
  frequencia = 60
  possui_neutro = $true
  possui_terra = $true
  tipo_conexao_alimentacao_potencia = 'BORNE'
  tipo_conexao_alimentacao_neutro = 'BORNE'
  tipo_conexao_alimentacao_terra = 'BORNE'
  tipo_corrente_comando = 'CA'
  tensao_comando = 220
  possui_plc = $false
  possui_climatizacao = $false
  possui_seccionamento = $false
  fator_demanda = '1.00'
  degraus_margem_bitola_condutores = 0
} | ConvertTo-Json
$projeto = Invoke-RestMethod -Method Post -Uri "$BaseUrl/projetos/" `
  -Headers $Headers -ContentType 'application/json' -Body $projetoBody
$ProjetoId = $projeto.id
Write-Host "projeto: $ProjetoId codigo=$codigo"

Write-Host '=== 4. Carga motor ==='
$cargaBody = @{
  projeto = $ProjetoId
  tag = 'M1'
  descricao = 'Motor bomba 1'
  tipo = 'MOTOR'
  quantidade = 1
  exige_protecao = $true
  exige_comando = $true
  ativo = $true
  motor = @{
    potencia_corrente_valor = '1.00'
    potencia_corrente_unidade = 'CV'
    tensao_motor = 380
    tipo_partida = 'DIRETA'
  }
} | ConvertTo-Json -Depth 5
$carga = Invoke-RestMethod -Method Post -Uri "$BaseUrl/cargas/" `
  -Headers $Headers -ContentType 'application/json' -Body $cargaBody
Write-Host "carga: $($carga.id) tag=$($carga.tag)"

Write-Host '=== 5. Dimensionamento ==='
$dim = Invoke-RestMethod -Method Get -Uri "$BaseUrl/dimensionamento/projeto/$ProjetoId/" -Headers $Headers
Write-Host "corrente_total: $($dim.corrente_total_painel_a) circuitos_carga: $($dim.circuitos_carga.Count)"

Invoke-RestMethod -Method Post -Uri "$BaseUrl/dimensionamento/projeto/$ProjetoId/recalcular/" `
  -Headers $Headers -ContentType 'application/json' -Body '{}' | Out-Null

$patchBody = @{
  circuitos = @()
  alimentacao_geral = $null
  confirmar_revisao = $true
} | ConvertTo-Json
try {
  $dim2 = Invoke-RestMethod -Method Patch -Uri "$BaseUrl/dimensionamento/projeto/$ProjetoId/condutores/" `
    -Headers $Headers -ContentType 'application/json' -Body $patchBody
  Write-Host "condutores_revisao_confirmada: $($dim2.condutores_revisao_confirmada)"
} catch {
  Write-Host "PATCH condutores falhou (esperado se circuitos pendentes): $($_.Exception.Message)"
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
}

Write-Host '=== 6. Composicao ==='
try {
  Invoke-RestMethod -Method Post `
    -Uri "$BaseUrl/composicao/projeto/$ProjetoId/gerar-sugestoes/" `
    -Headers $Headers -ContentType 'application/json' `
    -Body (@{ limpar_antes = $true } | ConvertTo-Json) | Out-Null
} catch {
  Write-Host "gerar-sugestoes aviso: $($_.ErrorDetails.Message)"
}
$snap = Invoke-RestMethod -Method Get -Uri "$BaseUrl/composicao/projeto/$ProjetoId/" -Headers $Headers
Write-Host "totais: $($snap.totais | ConvertTo-Json -Compress)"

Write-Host '=== 7. Export ==='
$outDir = Join-Path $env:TEMP 'demo-pac-validacao'
New-Item -ItemType Directory -Force -Path $outDir | Out-Null
Invoke-WebRequest -Uri "$BaseUrl/composicao/projeto/$ProjetoId/export/xlsx/" `
  -Headers $Headers -OutFile (Join-Path $outDir "composicao.xlsx")
Invoke-WebRequest -Uri "$BaseUrl/composicao/projeto/$ProjetoId/export/pdf/" `
  -Headers $Headers -OutFile (Join-Path $outDir "composicao.pdf")
$xlsx = Get-Item (Join-Path $outDir 'composicao.xlsx')
$pdf = Get-Item (Join-Path $outDir 'composicao.pdf')
Write-Host "xlsx bytes: $($xlsx.Length) pdf bytes: $($pdf.Length)"

Write-Host '=== 8. Historico ==='
$hist = Invoke-RestMethod -Method Get -Uri "$BaseUrl/projetos/$ProjetoId/historico/" -Headers $Headers
Write-Host "eventos: $($hist.Count)"

Write-Host '=== SUCESSO ==='
Write-Host "ProjetoId=$ProjetoId"
Write-Host "Exports=$outDir"

