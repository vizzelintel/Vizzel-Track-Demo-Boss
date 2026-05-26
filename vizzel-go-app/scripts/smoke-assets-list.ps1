# Asset list + dashboard data parity smoke
$Base = if ($env:SMOKE_BASE) { $env:SMOKE_BASE } else { "https://vizzel-track-demo-boss.fly.dev" }
$Email = if ($env:SMOKE_EMAIL) { $env:SMOKE_EMAIL } else { "admin@demo.local" }
$Pass = if ($env:SMOKE_PASS) { $env:SMOKE_PASS } else { "demo1234" }

function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }
function Ok($msg) { Write-Host "OK: $msg" -ForegroundColor Green }

$loginBody = @{ email = $Email; password = $Pass } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$Base/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
if (-not $login.access_token) { Fail "login" }
$h = @{ Authorization = "Bearer $($login.access_token)" }
$org = $login.user.organization_id
Ok "login org=$org"

$dash = Invoke-RestMethod -Uri "$Base/dashboard/initial-data/$org" -Headers $h
$dashTotal = [int]$dash.data.summary.totalAssets
if ($dashTotal -lt 1) { Fail "dashboard totalAssets=$dashTotal" }
Ok "dashboard totalAssets=$dashTotal"

$init = Invoke-RestMethod -Uri "$Base/asset/initial-data/$org/1/10" -Headers $h
if ($init.assets.total -lt 1) { Fail "initial-data total=$($init.assets.total)" }
if ($init.assets.data.Count -lt 1) { Fail "initial-data rows empty" }
if ($null -eq $init.assets.data[0].id) { Fail "initial-data row missing id" }
Ok "initial-data total=$($init.assets.data.Count) rows (total=$($init.assets.total))"

$list = Invoke-RestMethod -Uri "$Base/asset/get/$org/1/10" -Headers $h
if ($list.total -ne $init.assets.total) {
  Fail "list total $($list.total) != initial $($init.assets.total)"
}
if ($list.data.Count -lt 1 -or $null -eq $list.data[0].id) { Fail "list row missing id" }
Ok "asset/get matches initial-data (total=$($list.total))"

# Reference arrays must not contain null elements
foreach ($key in @("categories", "types", "classes", "statuses")) {
  $arr = $init.$key
  if ($null -eq $arr) { Fail "$key is null" }
  foreach ($row in $arr) {
    if ($null -eq $row) { Fail "$key contains null entry" }
    if ($null -eq $row.id) { Fail "$key row missing id" }
  }
}
Ok "reference data has no null rows"

Write-Host "`nAsset list smoke passed." -ForegroundColor Cyan
