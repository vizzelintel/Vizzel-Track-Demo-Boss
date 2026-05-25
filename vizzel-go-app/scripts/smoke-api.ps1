# Smoke test Nest-compat APIs (requires network)
$Base = if ($env:SMOKE_BASE) { $env:SMOKE_BASE } else { "https://vizzel-track-demo-boss.fly.dev" }
$Email = if ($env:SMOKE_EMAIL) { $env:SMOKE_EMAIL } else { "admin@demo.local" }
$Pass = if ($env:SMOKE_PASS) { $env:SMOKE_PASS } else { "demo1234" }

function Fail($msg) { Write-Host "FAIL: $msg" -ForegroundColor Red; exit 1 }
function Ok($msg) { Write-Host "OK: $msg" -ForegroundColor Green }

$loginBody = @{ email = $Email; password = $Pass } | ConvertTo-Json
$login = Invoke-RestMethod -Uri "$Base/api/v1/auth/login" -Method POST -Body $loginBody -ContentType "application/json"
if (-not $login.access_token) { Fail "login no token" }
$token = $login.access_token
$orgId = $login.user.organization_id
$headers = @{ Authorization = "Bearer $token" }
Ok "login org=$orgId"

function Get-Json($path) {
  return Invoke-RestMethod -Uri "$Base$path" -Headers $headers
}

$summary = Get-Json "/dashboard/summary/$orgId"
if (-not $summary.data) { Fail "summary missing data" }
Ok "summary"

$trend = Get-Json "/dashboard/trend/$orgId"
if (-not ($trend.data -is [Array])) { Fail "trend data not array" }
Ok "trend ($($trend.data.Count) points)"

$newAssets = Get-Json "/dashboard/new-assets/$orgId"
if (-not ($newAssets.data -is [Array])) { Fail "new-assets data not array (was: $($newAssets.data.GetType().Name))" }
Ok "new-assets ($($newAssets.data.Count) items)"

$location = Get-Json "/dashboard/location/$orgId"
if (-not ($location.data -is [Array])) { Fail "location data not array" }
if ($location.data.Count -gt 0 -and -not $location.data[0].location) { Fail "location missing .location field" }
Ok "location ($($location.data.Count) rows)"

$depr = Get-Json "/dashboard/depreciation/$orgId"
if (-not ($depr.data -is [Array])) { Fail "depreciation data not array" }
Ok "depreciation"

$status = Get-Json "/dashboard/status/$orgId"
if (-not ($status.data -is [Array])) { Fail "status data not array" }
Ok "status"

Write-Host "`nAll smoke checks passed." -ForegroundColor Cyan
