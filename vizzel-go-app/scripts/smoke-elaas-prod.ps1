param(
  [string]$BaseUrl = "https://vizzel-track-demo-boss.fly.dev",
  [string]$Email = "admin@demo.local",
  [string]$Password = "demo1234",
  [string]$File = "elaas-sample.xlsx",
  [switch]$DryRunOnly
)

$ErrorActionPreference = "Stop"

Write-Host "[1/3] login $Email" -ForegroundColor Cyan
$login = Invoke-RestMethod -Uri "$BaseUrl/api/v1/auth/login" -Method Post `
  -Body (@{ email = $Email; password = $Password } | ConvertTo-Json) `
  -ContentType "application/json"
$token = $login.access_token
Write-Host "token_len=$($token.Length)" -ForegroundColor Green

function Invoke-ElaasImport {
  param([string]$DryRun)
  Add-Type -AssemblyName System.Net.Http
  $client = New-Object System.Net.Http.HttpClient
  $client.Timeout = [TimeSpan]::FromMinutes(5)
  $client.DefaultRequestHeaders.Authorization = New-Object System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", $token)
  $form = New-Object System.Net.Http.MultipartFormDataContent
  $bytes = [System.IO.File]::ReadAllBytes($File)
  $fileContent = New-Object System.Net.Http.ByteArrayContent(,$bytes)
  $fileContent.Headers.ContentType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  $form.Add($fileContent, "file", [System.IO.Path]::GetFileName($File))
  $form.Add((New-Object System.Net.Http.StringContent($DryRun)), "dryRun")
  $url = "$BaseUrl/api/v1/assets/import/elaas"
  $sw = [Diagnostics.Stopwatch]::StartNew()
  $resp = $client.PostAsync($url, $form).GetAwaiter().GetResult()
  $sw.Stop()
  $body = $resp.Content.ReadAsStringAsync().GetAwaiter().GetResult()
  Write-Host "POST $url status=$([int]$resp.StatusCode) elapsed=$([math]::Round($sw.Elapsed.TotalSeconds,1))s" -ForegroundColor Yellow
  if ([int]$resp.StatusCode -ge 400) {
    Write-Host $body -ForegroundColor Red
    throw "import failed"
  }
  $obj = $body | ConvertFrom-Json
  $obj
}

Write-Host "[2/3] dry-run import (preview only)" -ForegroundColor Cyan
$dry = Invoke-ElaasImport -DryRun "true"
Write-Host "data_rows=$($dry.data_rows) validRows=$($dry.validRows) importedCTA=$($dry.imported) skipped=$($dry.skipped) failed=$($dry.failed) newCategories=$($dry.newCategories.Count) newTypes=$($dry.newTypes.Count) newStatuses=$($dry.newStatuses -join ',') newSourceFunds=$($dry.newSourceFunds.Count)" -ForegroundColor Green
$dry.summary | ConvertTo-Json -Depth 5 | Write-Host

if ($DryRunOnly) {
  Write-Host "Stopping after dry-run as requested" -ForegroundColor Yellow
  exit 0
}

Write-Host "[3/3] real import (this can take a minute or two on Supabase)" -ForegroundColor Cyan
$real = Invoke-ElaasImport -DryRun "false"
Write-Host "imported=$($real.imported) failed=$($real.failed) skipped=$($real.skipped) data_rows=$($real.data_rows)" -ForegroundColor Green
if ($real.errors -and $real.errors.Count -gt 0) {
  Write-Host "FIRST 5 ERRORS:" -ForegroundColor Red
  $real.errors | Select-Object -First 5 | ConvertTo-Json -Depth 5 | Write-Host
}

Write-Host "[done] re-fetching assets list (page 1)" -ForegroundColor Cyan
$listed = Invoke-RestMethod -Uri "$BaseUrl/api/v1/assets?page=1&page_size=5" -Headers @{ Authorization = "Bearer $token" }
$total = if ($listed.total) { $listed.total } elseif ($listed.Total) { $listed.Total } else { "n/a" }
Write-Host ("listed total: " + $total)
$listed.data | Select-Object -First 5 | ConvertTo-Json -Depth 4 | Write-Host
